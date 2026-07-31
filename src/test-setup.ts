import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

if (!HTMLDialogElement.prototype.showModal) {
	HTMLDialogElement.prototype.showModal = function () {
		this.setAttribute('open', '');
	};
}

if (!HTMLDialogElement.prototype.close) {
	HTMLDialogElement.prototype.close = function () {
		this.removeAttribute('open');
	};
}
