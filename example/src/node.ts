import Rect from "./rect";

export default class Node {

	element: HTMLElement;
	content: HTMLElement;
	rect: Rect;

	constructor(x: number, y: number, w: number, h: number, color: string, html: string) {
		this.rect = new Rect(x, y, w, h);
		this.element = document.createElement("div");
		this.element.classList.add("node");
		this.element.style.backgroundColor = color;
		this.content = document.createElement("div");
		this.content.classList.add("node__content");
		this.content.innerHTML = html;
		this.element.appendChild(this.content);
		this.updatePos();
	}

	updatePos() {
		this.element.style.left = this.rect.x + "px";
		this.element.style.top = this.rect.y + "px";
		this.element.style.width = this.rect.w + "px";
		this.element.style.height = this.rect.h + "px";
	}

}
