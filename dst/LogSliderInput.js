import { createElement, getUniqueId } from "./DOM.js";
import EventBUS from "./EventBUS.js";
import { Loop } from "./Loop.js";
class LogSliderInput extends HTMLDivElement {
    #inputValue;
    #minValue;
    #maxValue;
    #min;
    #max;
    #slider;
    #stepNumber;
    #input;
    constructor({ text = "", min = 1, max = 1e40, id = "", stepNumber = 100, } = {}) {
        super();
        this.id = getUniqueId(id);
        this.innerText = text;
        this.classList.add("LogSliderInput");
        this.#minValue = min;
        this.#maxValue = max;
        this.#min = min === 0 ? min : Math.log(min);
        this.#max = Math.log(max);
        this.#stepNumber = stepNumber;
        const sliderHolder = createElement({}, "sliderHolder");
        this.#slider = createElement({ tag: "input", id }, "slider");
        this.#slider.type = "range";
        this.#slider.min = `0`;
        this.#slider.max = `${stepNumber}`;
        this.#input = createElement({ tag: "input", id }, "input");
        this.#input.type = "text";
        sliderHolder.append(this.#slider, this.#input);
        this.append(sliderHolder);
        this.#slider.addEventListener("input", () => {
            let val = Number(this.#slider.value);
            this.#valueFromSlider(val);
        });
        this.#input.addEventListener("change", () => {
            let val = Number(this.#input.value);
            if (isNaN(val))
                this.#input.value = `${this.#inputValue}`;
            if (val < this.#minValue) {
                val = this.#minValue;
                this.#input.value = `${val}`;
            }
            if (val > this.#maxValue) {
                val = this.#maxValue;
                this.#input.value = `${val}`;
            }
            this.value = val;
        });
        if (Loop.isRunning())
            this.disable();
        EventBUS.registerEventListener({ eventType: "togglePlay" }, (e) => {
            e.play ? this.disable() : this.enable();
        });
    }
    #valueFromSlider = (pos) => {
        const scale = (this.#max - this.#min) / this.#stepNumber;
        this.value = Math.exp(this.#min + scale * pos);
    };
    set value(val) {
        this.#inputValue = val;
        this.#input.value = val.toExponential(4);
        const scale = (this.#max - this.#min) / this.#stepNumber;
        const value = (Math.log(val) - this.#min) / scale;
        this.#slider.value = `${isNaN(value) ? 0 : value}`;
        EventBUS.fireEvent("logSliderUpdate", { id: this.id, value: val });
    }
    get value() {
        return this.#inputValue;
    }
    enable() {
        this.#input.disabled = false;
        this.#slider.disabled = false;
    }
    disable() {
        this.#input.disabled = true;
        this.#slider.disabled = true;
    }
}
customElements.define("log-slider-input", LogSliderInput, { extends: "div" });
export default LogSliderInput;
