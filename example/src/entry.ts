import "./style.styl";

import Atlas from "./atlas";
import Node from "./node";

const m = 60;
const n = 80;

window.addEventListener("load", ()=>{
	let atlas = new Atlas("main");
	for (let i=0; i<m; i++) {
		let ii = ("0" + Math.round(255 * i / (m-1)).toString(16)).substr(-2);
		for (let j=0; j<n; j++) {
			let jj = ("0" + Math.round(255 * j / (n-1)).toString(16)).substr(-2);
			let color = "#" + jj + "80" + ii;
			let node = new Node(j*45, i*60, 30, 40, color, `${j},${i}<br>Test server<br>2core-2GB<br>Disk: 20GB`);
			atlas.addNode(node);
		}
	}
});
