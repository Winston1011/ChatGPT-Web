"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
const tslib_1 = require("tslib");
const node_fetch_1 = tslib_1.__importDefault(require("node-fetch"));
const querystring_1 = tslib_1.__importDefault(require("querystring"));
const utils_1 = require("../../utils");

async function precreate(base, config, options) {
    const baseApiStr = base.api
    const lowerBaseApiStr = baseApiStr.toLowerCase();
    const data = (0, utils_1.filterObjectNull)({
        device: 'pc',
        ...config,
        ...options
    });
    if (lowerBaseApiStr.includes('pays.oocuo.com')) {
        delete data.device
        delete data.clientip
        delete data.param
    }
    const sortedData = (0, utils_1.ksort)(data);
    console.log('sortedData', sortedData);

    const query = (0, utils_1.buildQueryString)(sortedData);
    const sign = (0, utils_1.generatePayMd5)(query + base.key);
    const formBody = querystring_1.default.stringify({
        sign,
        sign_type: 'MD5',
        ...data
    });
    let api = '';
    let response;
    let json;
    if (lowerBaseApiStr.includes('pay.bluetuo.com')) {
        api = base.api + '/mapi.php';
        response = await (0, node_fetch_1.default)(api, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
            },
            body: formBody
        });
        json = await response.json();
        console.log('拓普易支付返回结构', json);
    } else if (lowerBaseApiStr.includes('fzpay.vip')) {
        api = base.api + '/submit.php';
        response = await (0, node_fetch_1.default)(`${api}?${formBody}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
            }
        });
        console.log('res json', response)
        return {
            code: response.status === 200 ? 0 : json.status,
            pay_url: response.url
        };
    } else if (lowerBaseApiStr.includes('vmq.nonezero.top')) { //微信V-免签
        api = base.api + '/submit.php';
        response = await (0, node_fetch_1.default)(`${api}?${formBody}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
            }
        });
        console.log('res json', response)
        if (response.status === 200) {
            const originalString = response.url;
            const replacedString = originalString.replace('submit.php', 'createOrder');
            const newResponse = await (0, node_fetch_1.default)(`${replacedString}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
                }
            });
            const text = await newResponse.text();
            // 使用正则表达式匹配并提取数字
            const regex = /orderId=(\d+)/;
            const match = text.match(regex);
			console.log('text,match', text, match)
			if (match === null || match === undefined) {
				return {
					code: -1,
					pay_url: ''
				};
			}
            const orderId = match[1];
            // 根据orderId查询订单信息并返回支付URL
            let payUrl;
            await node_fetch_1(`https://vmq.nonezero.top/getOrder?orderId=${orderId}`)
                .then(response => response.json())
                .then(data => {
                    payUrl = data.data.payUrl;
                });
            console.log('payUrl', payUrl);
            return {
                code: 0,
                pay_url: payUrl
            };
        }
        return {
            code: response.status === 200 ? 0 : json.status,
            pay_url: response.url
        };
    } else if (lowerBaseApiStr.includes('pays.oocuo.com')) { // 添加零云源
        api = base.api + '/pay/apisubmit';
        response = await (0, node_fetch_1.default)(api, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
            },
            body: formBody
        });
        json = await response.json();
        console.log('零云源支付返回结构', json);
        return {
            code: json.code === 1 ? 0 : json.code,
            pay_url: json.h5_qrurl
        };
    } else { //默认彩虹易支付
        api = base.api + '/mapi.php';
        response = await (0, node_fetch_1.default)(api, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
            },
            body: formBody
        });
        json = await response.json();
        console.log('默认彩虹易支付返回结构', json);
    }
    return {
        code: json.code === 1 ? 0 : json.code,
        pay_url: json.payurl || json.qrcode || json.urlscheme
    };
}

async function checkNotifySign(params, key) {
    const sign = params.sign;
    const data = (0, utils_1.filterObjectNull)({
        ...params,
        channel: null,
        sign: null,
        sign_type: null
    });
    const sortedData = (0, utils_1.ksort)(data);
    const query = (0, utils_1.buildQueryString)(sortedData);
    const newSign = (0, utils_1.generatePayMd5)(query + key);
    return sign === newSign;
}

exports.default = {
    precreate,
    checkNotifySign
};
