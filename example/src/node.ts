import Rect from "./rect";

export default class Node {

	element: HTMLElement;
	rect: Rect;

	constructor(x: number, y: number, w: number, h: number, klass: string, html: string) {
		this.rect = new Rect(x, y, w, h);
		this.element = document.createElement("div");
		this.element.classList.add("node");
		this.element.classList.add(klass);
		this.element.innerHTML = html;
		this.updatePos();
	}

	updatePos() {
		this.element.style.left = this.rect.x + "px";
		this.element.style.top = this.rect.y + "px";
		this.element.style.width = this.rect.w + "px";
		this.element.style.height = this.rect.h + "px";
	}

}
