/**
 * Used for type safe Css styling
 */
type styleDeclaration = Partial<CSSStyleDeclaration> & {
  [propName: string]: string;
};

const body = document.getElementsByTagName("body")[0];

let idCounter = 0;
const getUniqueId = (id: string = "") => {
  return `${id}_${idCounter++}`;
};

/**
 * Simplify the use of the DOM-Api.
 * @param tag Optional Element tag. Defaults to "div"
 * @param id Optional id. Defaults to ""
 * @param style Optinal CSS elemt style. Defaults to an empty Object
 * @param classes Variable amount of classes the Element should have
 */
const createElement = (
  {
    tag = "div",
    id = "",
    style = {},
  }: {
    tag?: keyof HTMLElementTagNameMap;
    id?: string;
    style?: styleDeclaration;
  } = {},
  ...classes: string[]
): HTMLElement => {
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
