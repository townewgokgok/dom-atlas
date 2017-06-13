import "./style.styl";

import Atlas from "./atlas";
import Node from "./node";

window.addEventListener("load", ()=>{
	let atlas = new Atlas("main");
	for (let i=0; i<50; i++) {
		for (let j=0; j<50; j++) {
			let node = new Node(j*45, i*60, 30, 40, "green", `${j},${i}`);
			atlas.addNode(node);
		}
	}
});
