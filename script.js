'use strict';
import 'regenerator-runtime/runtime'
import 'core-js/stable'
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  //Public fields
  date = new Date();
  clicks = 0;
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; //in km
    this.duration = duration; //in min
  }
  _click() {
    this.clicks++;
  }

  _getDesc() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.desc = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    //you can call any method in constructor function
    this._calcPace();
    this._getDesc();
  }

  _calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, ElevGain) {
    super(coords, distance, duration);
    this.ElevGain = ElevGain;
    this._calcSpeed();
    this._getDesc();
  }

  _calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
// const run1 = new Running([39,12],17,24,180);
// const cycling1 = new Cycling([39,12],30,45,90);
// console.log(run1,cycling1);

/////////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapEvent;
  #mapZoomIn = 13;
  #workouts = [];
  constructor() {
    //Get user's position
    this._getposition();

    //Get data from local storage
    this._getLocalStorage();

    //Event listeners
    form.addEventListener('submit', this._newWorkOut.bind(this));
    inputType.addEventListener('change', this._toggleElevField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    //guard clause
    if (!workoutEl) return;
    const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);
    // console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomIn, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    //using the public interface
    // workout._click();
  }
  _getposition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      this._fail
    );
  }
  _fail() {
    alert(`Can't access your location`);
  }
  _loadMap(position) {
    //initially 'this' keyword is set to undefined in this function coz it is treated as a regular function call as it is being called by getCurrentPosition() not by us. so that's why we used bind.
    //success
    // console.log(position);
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    // console.log(latitude, longitude);
    this.#map = L.map(
      'map' /*take the id of the element whwre you want to show the map*/
    ).setView(
      coords /*[latitude,longitude]*/,
      this.#mapZoomIn /*ZoomIN Value*/
    );
    // console.log(map);//An object with various useful prop and methods

    //L->Namespace accessed from leaflet js library
    //tileLayer() -> gets tiles of map from an URL specified as parameter
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showform.bind(this)); //on() exactly like addWventListener in standard javascript got from leaflet js library
    inputType.value = 'running';
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  _showform(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    //Empty inputs
    inputDistance.value = '';
    inputCadence.value = '';
    inputElevation.value = '';
    inputDuration.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkOut(e) {
    e.preventDefault();

    //HELPER FUNCTIONS
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const positiveInt = (...inputs) => inputs.every(inp => inp > 0);

    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    //If workout running, create running object
    if (type === 'running') {
      //Check if data is valid
      const cadence = +inputCadence.value;

      //GUARD CLAUSE
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !positiveInt(distance, duration, cadence)
      ) {
        return alert('Input have to be positive numbers');
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If workout cycling, create cycling object
    if (type === 'cycling') {
      //Check if data is valid
      const elevGain = +inputElevation.value;

      //GUARD CLAUSE
      if (
        !validInputs(distance, duration, elevGain) ||
        !positiveInt(distance, duration)
      ) {
        return alert('Input have to be positive numbers');
      }
      workout = new Cycling([lat, lng], distance, duration, elevGain);
    }

    //Add new object to the workout array
    this.#workouts.push(workout);
    // console.log(workout);
    //Render workout on map as marker
    this._renderWorkoutMarker(workout);

    //Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    //Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴‍♀️'} ${workout.desc}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.desc}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;
    }
    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.ElevGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    //now string converted to object. Now this object is a regular object with breaked prototype chain

    // console.log(data);
    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      // this._renderWorkoutMarker(work);can't put marker here coz at this point the map variable hasn't yet been defined
    });
  }

  //PUBLIC METHOD
  reset(){
    localStorage.removeItem('workouts');
    location.reload();//A big object in the browser contain lot of prop and methods
    //reload() use to reload the page.
    //use it in console.
  }
}
const app = new App();
// console.log(app);
