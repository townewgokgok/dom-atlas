import "./style.styl";

import Atlas from "./atlas";
import Node from "./node";

window.addEventListener("load", ()=>{
	let atlas = new Atlas("main");
	for (let i=0; i<200; i++) {
		let node = new Node(i*50, i*1, 30, 20, "green", `${i}`);
		atlas.addNode(node);
	}
});
