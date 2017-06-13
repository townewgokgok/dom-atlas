declare module 'wheel' {
	export function addWheelListener(e: Element, fn:(e:Event)=>void, useCapture?: boolean): void;
	export function removeWheelListener(e: Element, fn:(e:Event)=>void, useCapture?: boolean): void;
}
