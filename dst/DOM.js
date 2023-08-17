const body = document.getElementsByTagName("body")[0];
let idCounter = 0;
const getUniqueId = (id = "") => {
    return `${id}_${idCounter++}`;
};
const createElement = ({ tag = "div", id = "", style = {}, } = {}, ...classes) => {
    const el = document.createElement(tag);
    el.id = getUniqueId(id);
    el.classList.add(...classes);
    el.style.display;
    Object.entries(style).forEach(([property, value]) => {
        for (let match of property.matchAll(/[A-Z]+/g)) {
            const target = match[0];
            property = property.replace(target, `-${target.toLowerCase()}`);
        }
        el.style.setProperty(property, String(value));
    });
    return el;
};
export { createElement, body, getUniqueId };
