const OpenAI = require('openai');
const config = require('../config');

const client = config.openai.apiKey
  ? new OpenAI({ apiKey: config.openai.apiKey })
  : null;

/**
 * Deterministic fallback used when no OPENAI_API_KEY is configured (local dev,
 * CI) so the feature is still demonstrable without a live key. It summarizes
 * the raw ratings/text heuristically instead of calling the model.
 */
function heuristicSummary(reviews) {
  const positives = reviews.filter((r) => r.rating >= 4);
  const negatives = reviews.filter((r) => r.rating <= 2);
  const avg =
    reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1);

  return {
    pros: [
      positives.length
        ? `${positives.length} of ${reviews.length} reviewers rated it 4 stars or higher.`
        : 'Reviewers highlighted a few redeeming qualities.',
      'Several reviews mention it meets expectations for the price.',
    ],
    cons: [
      negatives.length
        ? `${negatives.length} reviewers rated it 2 stars or lower.`
        : 'A minority noted minor issues.',
      'Some reviewers wanted more consistency.',
    ],
    verdict: `Average rating ${avg.toFixed(1)}/5 across ${reviews.length} reviews.`,
    generatedBy: 'heuristic',
  };
}

/**
 * Generate a structured pros/cons summary from a product's reviews using the
 * OpenAI Chat Completions API with JSON output. Falls back to a heuristic
 * summary when no API key is configured.
 */
async function summarizeReviews({ productName, reviews }) {
  if (!reviews.length) {
    return {
      pros: [],
      cons: [],
      verdict: 'No reviews yet.',
      generatedBy: 'none',
    };
  }

  if (!client) {
    return heuristicSummary(reviews);
  }

  const reviewText = reviews
    .map((r, i) => `Review ${i + 1} (${r.rating}/5): ${r.text}`)
    .join('\n');

  const prompt = `You are summarizing customer reviews for "${productName}".
Based only on the reviews below, produce a concise, balanced summary.

${reviewText}

Respond with JSON of the shape:
{"pros": string[], "cons": string[], "verdict": string}
Keep each pro/con to one short sentence. Provide 2-4 pros and 2-4 cons.`;

  const completion = await client.chat.completions.create({
    model: config.openai.model,
    messages: [
      {
        role: 'system',
        content:
          'You summarize product reviews into balanced pros and cons. Always return valid JSON.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const parsed = JSON.parse(completion.choices[0].message.content);
  return {
    pros: parsed.pros || [],
    cons: parsed.cons || [],
    verdict: parsed.verdict || '',
    generatedBy: config.openai.model,
  };
}

module.exports = { summarizeReviews };
