import React, { Component } from 'react';
import {
	InputGroup,
	Button,
	Modal,
	ModalHeader,
	ModalBody,
	Form,
	FormGroup,
	Label,
	Input,
	InputGroupAddon,
	NavLink,
	Container
} from 'reactstrap';

import { connect } from 'react-redux';
import { addMovie } from '../actions/movieActions';

class AddMovieModal extends Component {
	state = {
		modal: false,
		title: '',
		format: 'Books',
		year: 1600,
		stars: ['']
	};

	toggle = () => {
		this.setState({
			modal: !this.state.modal,
			title: '',
			format: 'Books',
			year: 1600,
			stars: ['']
		});
	};

	onTitleChange = (event) => {
		this.setState({
			title: event.target.value
		});
	};

	onYearChange = (event) => {
		this.setState({
			year: event.target.value
		})
	};

	onFormatChange = (event) => {
		this.setState({
			format: event.target.value
		});
	};

	onStarChange = (event, index) => {
		const stars = this.state.stars;
		stars[index] = event.target.value;

		this.setState({
			stars: stars
		})
	};

	addStar = () => {
		this.setState({
			stars: [...this.state.stars, '']
		});
	};

	removeStar = (event, index) => {
		event.preventDefault();

		this.state.stars.splice(index, 1);
		this.setState({
			stars: this.state.stars
		});
	};

	onSubmit = e => {
		e.preventDefault();

		const movie = {
			title: this.state.title,
			year: this.state.year,
			format: this.state.format,
			stars: this.state.stars
		};

		this.props.addMovie(movie)
			.then(() => {
				this.setState({
					modal: false
				});
			})
			.catch((error) => (alert(error.response.data)));
	};

	render() {
		return (
			<Container>
				<NavLink
					className="navigation-link"
					color="light"
					onClick={ this.toggle }>
					Add favourite
				</NavLink>

				<Modal
					isOpen={ this.state.modal }
					toggle={ this.toggle }>
					<ModalHeader
						toggle={ this.toggle }>
						Add favourite
					</ModalHeader>
					<ModalBody>
						<Form
							onSubmit={ this.onSubmit }>
							<FormGroup>
								<Input
									id="title"
									name="title"
									type="text"
									required
									maxLength="100"
									placeholder="Name"
									onChange={ this.onTitleChange }/>
								<Input
									id="year"
									name="year"
									type="number"
									required
									min="1600"
									max="2021"
									placeholder="Year"
									className="mt-3"
									onChange={ this.onYearChange }/>
								<Label
									for="format"
									className="mt-3">
									Category
								</Label>
								<Input
									type="select"
									name="format"
									onChange={ this.onFormatChange }>
									<option>Books</option>
									<option>Movies</option>
									<option>Restaurants</option>
									<option>Electronics</option>
								</Input>
								<Label
									className="mt-3">
									Comment
								</Label>
								{ this.state.stars.map((star, index) => {
										return (
											<div
												key={ index }
												className="mb-3">
												<InputGroup>
													<Input
														type="text"
														value={ star }
														onChange={ (event) => (this.onStarChange(event, index)) }
														placeholder=""
														required
														maxLength="1000"/>
													<InputGroupAddon
														addonType="append">
														<Button
															color="dark"
															className="fa fa-trash"
															onClick={ (event) => (this.removeStar(event, index)) }/>
													</InputGroupAddon>
												</InputGroup>
											</div>
										)
									}) }
								<Button
									color="dark"
									outline
									block
									onClick={ this.addStar }>
									Add another comment
								</Button>
								<Button
									color="dark"
									block
									style={{ marginTop: '2rem' }}
									type="submit">
									Add to Favourites
								</Button>
							</FormGroup>
						</Form>
					</ModalBody>
				</Modal>
			</Container>
		);
	}
}

const mapStateToProps = state => ({
	movie: state.movie
});

export default connect(
	mapStateToProps,
	{ addMovie }
)(AddMovieModal);
