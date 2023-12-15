"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function pagingData({ page, page_size }, zero = true) {
    page = Number(page) || 1;
    page_size = Number(page_size) || 10;
    if (page <= 0 || typeof page != 'number') {
        page = 1;
    }
    if (zero && (page > 0 || typeof page != 'number')) {
        page -= 1;
    }
    if (typeof page_size != 'number') {
        page_size = 10;
    }
    return { page, page_size };
}
exports.default = pagingData;