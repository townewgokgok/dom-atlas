export default class Vec {

	x: number;
	y: number;

	constructor(x: number, y:number) {
		this.set(x, y);
	}

	clone(): Vec {
		return new Vec(this.x, this.y);
	}

	set(x: number, y:number): Vec {
		this.x = x;
		this.y = y;
		return this;
	}

	size(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	add(v: Vec): Vec {
		return new Vec(this.x + v.x, this.y + v.y);
	}

	addXY(x: number, y: number): Vec {
		return new Vec(this.x + x, this.y + y);
	}

	sub(v: Vec): Vec {
		return new Vec(this.x - v.x, this.y - v.y);
	}

	subXY(x: number, y: number): Vec {
		return new Vec(this.x - x, this.y - y);
	}

	mul(v: Vec): Vec {
		return new Vec(this.x * v.x, this.y * v.y);
	}

	mulXY(x: number, y: number): Vec {
		return new Vec(this.x * x, this.y * y);
	}

	div(v: Vec): Vec {
		return new Vec(this.x / v.x, this.y / v.y);
	}

	divXY(x: number, y: number): Vec {
		return new Vec(this.x / x, this.y / y);
	}

}
