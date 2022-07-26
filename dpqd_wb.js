/**
 * cron: 59 20,23 * * *定时可以增加，不要取消23:59分那次，否则啥都签不到。青龙配置文件随机延迟取消即RandomDelay=""。
 * 想跑几个号自己在定时任务命令后面加限制,如何限制去百度，问我也不知道，脚本内部不做限制。跑几个号就几个号给我助力。
 * 默认不推送通知，可以添加环境变量NOTIFY_DPQD为true开启，能不能签到豆查询就好了，签到通知与否没关系。
 * 环境变量名称：TK_SIGN，环境变量值：{"id":*,"sign":"**********************"}
 * 用上面的环境变量报读取出错则拆分为TK_SIGN_ID和TK_SIGN_SIGN两个变量，对应上面｛｝里的两个值，若不报错则忽略此行。
*/
let TK_SIGN
if (process.env.TK_SIGN) {
	TK_SIGN = JSON.parse(process.env.TK_SIGN)
}

if (process.env.TK_SIGN_ID&&process.env.TK_SIGN_SIGN) {
	TK_SIGN = {id:process.env.TK_SIGN_ID,sign:process.env.TK_SIGN_SIGN}
}

const $ = new Env('店铺签到(含加密挖宝助力）');
const request = require('request')
const notify = $.isNode() ? require('./sendNotify') : '';
const axios = require('axios')
const JD_API_HOST = 'https://api.m.jd.com/api?appid=interCenter_shopSign';

let nowHours = new Date().getHours()
let nowMinutes = new Date().getMinutes()
let cookiesArr = []
let fcwb = []
let token = []
let logtemp=[]
let codestemp=[]
let wblimits
let cookie = ''
let UserName = ''
let message=''
let notify_dpqd = false
let emergency=[]
let apidata
let control
let msg=[]
let inviteCodes = [];
let ip = ''
let PROXY_HOST =''
let PROXY_PORT =''
let PROXY_AUTH = ''
let PROXY=''
if (process.env.NOTIFY_DPQD){notify_dpqd = process.env.NOTIFY_DPQD} //凌晨签到是否通知，变量设置true则通知，默认不通知，估计影响签到网速，未验证。22点签到通知结果。
//时间格式
Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1
        .length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length ==
            1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}
//从KR大佬脚本偷来的挖宝加密代码
var OＯ0$ = 'jsjiami.com.v6',
    OＯ0$_ = ['‮OＯ0$'],
    O00O = [OＯ0$, 'w4rCtMODwrYJ', 'AB9ta8O3', 'w5rCnMOWw4HDtw==', '44C35Yqp5YiM54m+5oCP44Gh772P', 'WsOaw6bDssKC', 'asKfHWnCtw==', 'CxLCu8KRWw==', 'w4jCo8KqfcK9', 'BB3ChR0i', 'w7LCuMKcSg==', 'w4xOwrFlw4A=', 'VHTDpcKhYBc8OcOV', 'OSPCsw==', 'VcKvQF0=', 'wrbCswIG6K6n5rCr5aSx6LWT776A6K6Q5qCX5p6t57ye6LeM6YaG6K22', 'SjJMwpxH', 'w7dreDXCiA==', 'IVrDhCMgw7cZ', 'MHvCjxE3', 'w5fDriNO', 'fQY3AMOh', 'woNqw7PDgQ==', 'w6XDicKUw6PDlwUUw6LDkA==', 'w4rCqsKiw5c=', 'wqRiw5k=', '5oqy5q6E776a6LO55LyI6Laa5Yy15be26bqJ77yZ6LS46Lyl77yi', 'w5fCkUJQOQ==', 'XwwAUcKb', 'bRbDr8OJOw==', 'PStSPMOSfg==', 'NFnCuzIowpRQwo8=', 'MS3CoEw=', 'YsOlw4HDisK5CMKhAyEU', 'w6J9QMOT', 'Ay/DmcO9wql/RHFU', 'w6LDicKW', 'w5TCh8OaEzzDtTsaBMKn', 'VjYSUQ==', 'NyDCu0IX', 'MBrDrnA3', 'Yy1cd8K+', 'dwh/woEN', 'Y8Ouw5vDk8KiBg==', 'TXZgTnjDqWo=', 'FsO2w487aQ==', 'KVfCl8K9cS7Cpg==', 'HjLDgQ==', 'w5/ClsK+woNv', 'Mnxvw5EO', 'w6NuRsO/w5rDoQ==', 'E8Ofw6JrwrE=', 'w650woNJw6rDg8Ox', 'LDAt', 'UsO9w5k6BA==', '44Go5YqO5YqI54ud5oOZ44K977+f', 'w4dHPBPDjsOxwo/DrTnCrcOAw47CpcODDg7CisKKDg==', 'E2nCjsK2RA==', 'wqhLw4TCjMKzw5XDsU4gw610woHDusKlEjbDjMKIwpTDjQ==', 'w4LCvRzDhh8=', 'w4jDnMOVYw==', 'axxxwqA=', 'wrHDkF1v', 'wo9uw6HCs8KP', '44Gt5Yul5Yq754io5oGA44Ou77y+', 'fms8wpHDkQ==', 'w4PDlMKLXg==', 'w6zCi8O2woJBHyw=', 'wojDn8OSw6FP', 'cxbCjsKoOw==', 'wq/DjsO0', 'wpk9w7HCsMO4', 'w6DDtsOu', 'w4rDlcKiwrYJ', 'TMKCw5k6', 'SMO+wooPTw==', 'wrZEwrfDr8OA', 'KVbChsK3ejrCvMOCw48=', 'V8KhSg==', 'E8K6Ozrorr3ms4/lpJXotLDvvLzor5Dmo7Lmn4rnvYLotaLph4PorI0=', 'd8KnwqY1McK4RMKo', 'ZmsOJ8OO', 'FEh0', 'wrEtYjjDlhTCsMOrwrE=', 'w6fDm8Kkwro=', 'fMKuwoJz6KyX5rCK5aWN6La7772T6K+f5qOJ5p+x576m6LS86YeL6K6a', 'bXfCjsOJRA==', 'RMOEwofDrA==', 'w4TDo8K3wqDCiA==', 'S8KvX0vDog==', 'w73Dk8KSwq86ecKo', 'C3PCu8KRJA==', 'wplcwo7DkcKZ', 'woJ5w7XDrcO8Zg==', 'CMO2w5FECA==', 'RTRZ', 'WsOaw7jDrMO9', 'P1DChsKTZzo=', 'GhJuwqbor5XmsoPlppzotLHvvo7oroLmoJnmnb7nvb3otLDphanorJg=', 'w4HDmsKBfn/CtQ==', 'ekjCkMKyYDzCpcOUwo12O8OiJcOiw7vCkBrDqUNFw7xE', 'wq7CmFQW', 'Hn5zaw==', 'w6LDusKpag==', 'djQXAQ==', 'w7xxwpBGw6bDk8Ojw7nCosO3wr5wWSA+TMKqwo7Ds1xNDsOPW8KRcGIbYsKZIAnDuA==', 'FCbChsO1wqI=', 'RxkJSMOCEkNGGSE=', 'wqDCicKkwp8aWMKEw5sIFsKDJWw=', 'Qz9fBsKOwrbCg1PCk8K4KiDDmsKewqlsHsK7w4DDj14ow5PCgnzCiMKZfMK4X8OIKMOIw5zCij9xw65bwqpnwqRjwpktEcOdOsK8w5Y3TcKcw709KEbDv8OJw6hIwoFFcMK1M8KteMO0w6VzAMONwqgcw4MJJMKEFnnDtEVfwo/Ctzg3V2I3wonCiMKkLMOyw7bCgMOlworDiFpCwqXDjEnDnlpwwrsRw5pjFGLCiAvDsw3Cr8OUw5XDgsKqaUBFesOFw5bDuHXDhG5SGcKPNF1IwqYIwozCksOeVDnCpSQ0fcKJX2vCnhQHK8O1w7o=', 'AAFzFMKW', 'w5NaeMOdMQ==', 'w5dTBMKCw6Y=', 'LmXCkQ8p', 'RMOaw7jCk8Kc', 'w4rCqsOdwqh2', 'cVJMHVI=', 'HgFzFMOp', 'Px/DpMKmw7w=', 'wrHDkF1vw6k=', 'w4xQwq97wr8=', 'wpNpQR7CiA==', 'PTjCoF0Aw7wSw5cvwqXCvMKpOk4vwqLChMKPwoV4GEjDi3BxBSwqJcKiw6gZwrQMwoPDjRvDlcOyw7QNGcOCZjrCmMKrwobDsGZ5wrDCowA=', 'w6jDisK5wrNCVkhALxzDvMKLwpXDmMKYw4dLDsKGw5PDtnpewpBeRGd+w4bCjWF4', 'wrHCsSJxwpY=', 'w4rDj8KPSyHDpybDjht9wpo6ecKfIHtB', 'Hn5ta8O3WQ==', 'LhrDrg8pwqQ=', 'wqsqXj7DnBY=', 'w43Dl8OFecKhwrHCm8OmM8OaTyjDkg==', 'w5/DqMK5w4XDqy4Iw4jDvMOBw63Ck34=', 'bcKQw54Yw5PDng==', 'BB15CcO5V2QzaCw=', 'W8K6w6VMwoLDpcKE', 'LANvw5EOw48=', 'DcKgwp11wq94', 'bXfCjsOXO00=', 'w7XCisOhwpM=', 'ERB6M8Oc', 'w7drGSvDtw==', 'dksXfg4=', 'PSFb', 'HTrDmcO/wqJ8fX5D', 'w7jCkz8q', 'Z8O4w4496K6u5rGa5aS06LWJ77+g6K+C5qOg5p2a57676LSK6YeO6K+0', 'N8OYw6wHPA==', 'LmXCkRFW', 'w5nCvR1/YA==', 'w6DDicKFwrBMXEc=', 'wrZaw4jDr8OA', 'YsOLJCIb', 'dMO+Ygg=', 'PEbDhCsLw6UHHw==', 'c3fDscKoJQ==', 'dzTDm8OqOmPDqUs=', 'w5/ClsK+wp0Q', 'SMK6X1HDqUY=', 'Vlk9w4In', 'w7rCnTU=', 'w6jCv356', '6K2i5YmT6Zmp5oaf5Z6QKTXDr8O3w7XovLvlhrjmoazkvKXml6Xlh53lrZNh5bis6K+C6YGl6L6z6Ier5p2H5Yyv6I2a5Y+ycsO+DEvCkMK3', 'GnzDpGIi', 'asKfHWk=', 'D28bM8Oc', 'w6PChS7DogDCv2da', 'w5LDoMO/XsK8wpXCpMOc', 'FWxYwppMwqLDmX3DrRvCkMO/EQ==', 'TXdxRHPDvXBVOg==', 'PTjCoF0Aw7wSw5c6wrrDqMKlcAoow6PCisOPwp0=', 'Z8Okw5A=', 'w5ZBOgnDl8O2wrXDsTE=', 'w6nCisO1wqJLIg==', 'aQgew74N', 'TFw/w5gse8KCwr5FwqANHsOvw7MkfDfDvcKNFcOsPxglY8OCFxpAwqHClcKAUDo2wpNsw5wCWcKkHHJscsOSw69zB3rDhMKBwoEGw57DnG/Ct8Kuw5p+wr9VHGjCukUifcODwojCn8OrSsOlKmcuw6rDoCRBw5fDsmUaw4lTw6LDjQlZIMOOwrrCtcOUWB7Cv2kuQQ/DoEQvHMOxwrYZw4vDsjTChn3CmlDDki3CpsKTUcO3w4Fxwr3Du1hEEm7DkcO7wpHDukVRw7XDhcK4wqzCj2s7wo9zw4g1w4LCpMKne1nCnwPDpALDowfDs0wlY0Eqw7kvwrTDjhwZe8KkPCjCnTXDvirCr1TCgsKrCcO1J3LCjcKdwog8NHglwqbCvF/DvU/Dv8OSw7MveMO9DsOzw4sHH8KkLsK6Zggrw5t8w4RUwpDDjG/CvT53bnzDhMKDwogbw6LCnsKyw5whdMOuwosJwpjCvMKKw4lywpPDo0Ikw4zDh8K2RRfCq2DCoMKrwqMfTXMfw750wrHCmsKrbcOQwp3CusOywqwrwqBWfsOfFEzDn8ODNlnDlyvDkFrCgjbDm2rDjcOwwpwgRxnDplPCksK9wrPCkcKaw6jDhsKPwrbDocOGw53CpHVmw6XChS9dO8O5w4DDpWlZw5tgVxluAMOEw7DDjEJMw6lyw6XCosOxeMOBDsKTwpYOwrXDu8KIVMOPw7lvccO4wrrDtMO7wpvCj8Ktw50KNsKBwo03OMOPCEB2AGF5fj7DnsOAworDijTChsO2woQxwqnDoTHDgUE1wrVGKsOxMwQkwoDCgmdOw61Hw4DDj8O4RsKGB21cw4HCiRLDpj8WwpTCu1LCicKAwqfDtcO9FQIZwqdowpDDn8KMw6rCpFtpwrZeCRzCt8O1wq3Ch8KIP8OSZRDDjcO3PcOifATCg8O4wrrChsOGwr7CkMOOwohkdA8Vw40aa1LCrUvDjMKUw5ApwrnDpzbChVPCuMOfcR7Ch8OWw7B1wqBsw4dHDMKiLcO/cA/CkFjDq8OgRG/CvUApwrgoHcOrwo7CgRNqwrAQLU/DpMO4VcObwq0abzwgKh7DpzFnw7XDhAclVcK8YUjDnBhIw4ouDh/DuEvCsBLDg8KBMFwCZcOnwpMcwqtdVsO5wp9NXcO9w6kRdsKPwq/CiMKPw4vDo18awoPCisOuKF9mf3piwoIQwr/CsMK0H8KZLcOcFsOZw6fCg1kJYcKbw7vCj8OWwr3CiQ==', 'wq/DkENxwpbClw==', 'O0DCl8K6cTvDpcKVwoQsX8K/fMK7wqbCkg==', 'V8KrQ1/Ds0k=', 'UkwSw5PDnw8=', 'NEPDiC83', 'wrA4fjXDlx4=', 'XTUMVcOTw7s=', 'Ik7DlTMg', 'wpTDkcOH', '5Lii5Lq65p+85Ymt5Zi36K616ZS15peq5oyh5Lmp56q377296K+I5qCM5p6L6ISV6Lue6KyW5aSe57+657uq5oC55Yeo', 'NxdCJMKXw6M=', 'Mys4C8KCDA==', 'wo7DoGBNw4M=', 'b0xMHQ==', 'w6jClsO1', 'wqLCjmIzYRUzCsK5G8Ol', 'w7XCrn92fQ==', 'w6LCv2d+', 'DU/CsCcSwp0=', 'wrBKw4PClA==', 'bsK9SErDiUDDhcKO', 'w7zDgsKQw7nDjA4Zw7jDmcOj', 'w7lgwpRL', 'QR0eU8KKF39GAQ==', 'w7LCkyYu', 'MEPDiC8h', 'XjJKwo4=', 'aMO+w4XDscKiGMKMCA==', '44OY5b2e5Yuz5Yip5YmT44OqBg==', 'w6/CsGV2fU8DwrPDmnA=', 'w5jDlMOEw75eUT1UcnZCw4fCqMKawrDDmsKzADvDkGB7', 'w5fCgcOGw6dEUzlNJnFbw4vDug==', 'YCzCjzHDmBrCtEfCjw==', 'czjDqRxFw7UIw41uw6XCpMOzaVF+w7nDj8OBwoB7FF7DmXh8FypzHcKjw6QOwr4ZwrfDtAnDhMOmw5IREsKLOiXCksKrwobDoS1Qw6nCuFHCqsODwrFNc8K9w64iw4HDrsOawrzDr8Khw7HCuS5s', 'wpMIX2HDqQ==', 'w4TDo8Kpw5/DqQ==', 'CxLDhMKR', 'fMOLOjx6', 'KWhcJMKJwpw=', 'UMKww7Y=', 'QS9KBsOEwqLDhWLCi8K+ai7CiMOJw6AqUcOhw5XCnQwpwojCjGHCmQ==', 'w6zDk8KCwqUxb8Kow6kGN8Ow', 'dzxZKsKb', 'wovDisOSw7tEVyRCMA==', 'w6tLMhPDlMO0wprCq2nDsMKvwp7DocOLKgDCisKWBsOudcKAfkDDhsO5OcO/Ck7DlcK9wpA1wo4iw6PClcKqwqLDvS9NXMOcO8Kfw57CtjDDnnYPwrJNbQJ5Q3Bzw4RZw6XDisOkwotJwrPDuGnCixDDicO5cBjClsOgTF9PIsOiwojCrQrCg8OwwrxIwrDDphLCpT9iLMKLw5rCsDfDmsORwok2Q8OHw6rCtMOlw55fwqFlasOIw4g6wonCs8KUD0jCjzDCkklUdMK1OHXCv8OyKcOxbizCjV7CicKYXBEgdkvCgTRlJcKOM3XDmg==', 'KXZCJMKXw6M=', 'cTgJW8OZw6oJw6o=', 'YSjDkcOzHWfDt2Rd', 'NxdCJMKXwpw=', 'IX7DusOZw7wr', 'WsK7w6bDsg==', 'E8OfwoN1wrF4', 'woBuw7PDhMOudcOE', 'XGjDjRfChjI=', 'w7LDicKSw7TDmR87', 'woE2fzrDkRbCk8OJw7o=', 'w4FBPB7DmcOswpo=', 'fTMjacOfQw==', 'wq84YA==', 'w7bDg8KJw7vDkQ4=', 'QWnDu8K8awI=', 'DcKgwoNrwq94', 'w7nDg8KBw5XDihk=', '5qyu5aegKWrngL7lk7HmlqzmsLTovqXoorLmnYjnqp7lu7LvvqLnu5PmnJLCoMORwqzCuw==', 'w4LohJfmnpLlja/ogLXpmbTml4rlppbmlo/vvLbohojmnr3lj4DogpDpmYvmlLblpIPmlKw7', 'YxhWYcO/w54=', 'LDAtJ8KeGQ==', 'FHxNwopMwqXDo3vDthzCv8Oi', 'FD9uw7Elwpo=', 'ccKvwrYbEcK9', 'w7ZIYMOEw6PDo3cowoTDg8OIwovCn2rDpsOMFVTDrcKaFV4=', 'bMOuw4PDt8KkAMKH', 'w4TDhsKoVGnCog==', 'V3E1Jg==', 'Qm7DoQ==', 'Yx9hMsK7w4/Cv0Q=', 'HUll', 'bUAZChoFw7nDnA==', 'w6R0JMKeBQ==', 'w4pLLw==', 'GilUw7ogwotF', 'w4F6J8KGCcORSgs=', 'w6HCu2d7aF4h', 'w47CgyLDoifCu3l1ZQ==', 'wq1ew4A=', 'w7PDhcKKw6TDnRk=', 'SRYi', 'SRIa', 'CC3DnMO0wqR+eGhUSBY=', 'PUfCgMK6dSnCtA==', 'VDQRUsOYw6ovw54qd8Kx', 'w6nDg8KFwoQwf8Kpw6k=', '6Ky/5Yuy6Zix5oaP5Z+gwrlTw5/CjUnovIHlh7TmoankvoPml73lhYXlrotu5buL6KyV6YGk6L+w6Ias5pyI5Y2J6Iyd5Y+3OMKsw4LCqSFR', '44GK5o+y56eO44OP6K+j5YSV6I2i5Y2y5Lia5LiD6LWN5Y295LmKw6/DscOEQsKuEWHnmL7mj5rkvannlKHDqcOVf8KBwrPChOeZqOS6huS4h+eulOWLjeiPjuWNqQ==', 'W8KPHwM5wrcLOlJCU0E9w6AgwrJ1w43DuEclHcKMQwgRw6F1wozDpT9YHsKoAXDDvsKswrEYScO5wpY=', 'ZmtvRg==', 'w4LCvX3Dhg==', 'w7jDn8KB', 'wpbDn8ONw7c=', 'w4TDvcKpw4HDqQ==', 'awJxw59t', 'a8K5w6IFR8KGw60rOnDCqsKMDcOZwqfCt0bDjWrCu8OPw6A1BMK5wqHCi2bCrX/DgsO1w7fCjMO/woXCi8OoISTChF/DhA==', 'w5TCqsKiwqg=', 'VjxZ', 'XyQB', 'HDzDi8K6', 'wq42dw==', '5q2i5aacw5QI54K05ZOJ5pai5rG+6L6t6KGd5p+X56mF5bqT776/57uT5p2GHS/Clyc=', 'w6rCsXQ=', 'O+iEvuadn+WNjuiBo+mbtOaUjuWns+aUlO+9quiFueaegeWOpOiBo+mZgeaVqeWkr+aUsic=', '6Ieb5YqM5YCv5q+D44KPceODqOWJouWumuiFvOadj+++oeS5huaWoOW8jeWNsOemn+eVkuOAvG/jgJ7oh5bmnavpmo7mlpLlprXmlbLvvb/oh5fmn47pmIzmlLblppHmlbnjgqAp', 'UGUvOg==', 'w6TCkzwrPwQ=', 'YBRDw67Crg==', 'UmZtSmnDsg==', 'w5MlGcKiLw==', 'EW8bLcKj', 'w4DDn8KDw6LDtgo3w7I=', 'dMKvwrE9Fw==', 'wpPDoGZdw44=', 'wqs3dDTDgA==', 'wq5Ww5PCl8KOwo7CswQ=', 'wo/Dj8K4w40TemDlvr7lp5njgIHkuJvkur7ot6TljLU=', 'w7zDgsKCw7XDgA==', 'SW0lJREmw4HDvg==', 'w40hwq3CisKlK8KPWsO+w6Q=', 'WyQqX8OXw6Yt', 'w6TDicKu', 'w6nDssO3SQ==', 'MOiupOmHs+aVn+eZmeW+lOiMmuWPgsKIHcKtw69cwqzCnsOiN1IgwqzCqcOkJ30swpgkwolCeRnDkMOaw4bDs8OdwpoVw7V6Pn3DqHbDmA/DrR0kwrlyw7w=', 'WyQoX8OUw6o=', 'Ek/CsCQowppJwoMHw5g=', 'MUDDiCssw6HltpjlpYvmlLbDiMOSSQ==', 'w6DDlMKtwrpT', 'wo/orJLphZ/mlZfnmYLlvIXoj73ljahxfsOYw4nCq8Kn', 'w7zDpMK3dD0=', 'C3PCu8KP', 'EEZgLsK2w4g=', 'Nk3Ckw==', 'HX7DqBF1', 'w7XCkyYsOA==', 'fzfCmg==', 'dTHCkznDmhHCpA==', 'TMKCwqYk', 'B+OAkOi2seWMvz/jgaHltqfpg5/orZvkuo7mlIrvvq0=', 'fMK0OiIb', 'LmXCjxEp', 'aDDCp8O4', 'w73DicKKw6DDuwQvw7nDiQ==', 'Vl09w4ItcsKjwr4T', 'wpLDrnU=', 'XcKaBhY=', 'RBkASMKAGA==', 'T2XDu8K4TR8gMcOY', 'MMKAwrU=', '44Ou6Lan5Y+l', 'w6fDiMKVwqkn', '44Cg5beW6YOz6K2W5Lik5pSL77+i', 'IStOKMOJeG0DSw==', 'ByDDj8OzwrQ=', 'CxLDhMKRWw==', 'w4LDnALDmAE=', 'aDDDmMO4QQ==', 'VmJwaHPDvg==', 'b8Kiw7E=', 'w5/Dt8Kgw7w=', 'P37DpMOZ', 'w5zCo33CuQ==', 'cxbDscOX', 'w6zCpsOjKw==', 'wrHDjkNv', 'AH5zaw==', 'ZgoOJw==', '6K2a5YmK6Zmp5oS05ZylwoUtw5M3Yui9qOWEq+ahmuS9neaUueWGnOWuigvluYPorqfpg6Tova7oh7nmnaDljKjoj6DljrvDrjjCtcO9SEc=', 'w5NEeMKiLw==', 'QGEy', 'wpMIQQDCiA==', 'w73DjcKWw6DDgS8zw7DDtcOpw4XCuA==', '5omx5q2277686LGw5L+86LeJ5Yyp5baT6bqQ776R6Leu6L2o776W', 'CMO2w48laQ==', 'wqhEw5bCkMK/', 'w656L8KoEsOG', 'w6HCgyo=', 'XwgeUcKBFEZJFg==', 'd8Kvwqg7', 'N2hCOsOo', 'w4lNZcOj', 'w41EeMK8MQ==', 'w610wpNC', 'RMOEw6bDssO9', 'cVIzfFI=', 'S2/DsA==', 'C1NhAsK2w4vCrMKXw5U=', 'wrBew4LCj8Kl', 'ZgoORsKx', 'w67DvcO+ScKK', 'w4fCvR0eHw==', 'w5zDnH3DmH4=', 'wqY4ZDA=', 'wp3DtGBsw4nCrcOew7I=', 'JD4+Aw==', 'Qlk7w5A=', 'SmHDpcKjaxQFNsOC', 'wqRew4TCnQ==', 'w6/CgCLDpio=', 'w656Lw==', 'Q2UyLw==', 'w69yQsObw53Do2cTwpLDlg==', 'w5nCiMOYGw==', 'w67DvcOsRcKGwpHCisOWFsO4', 'FRLCu8KPJA==', 'YBQiwpHDkQ==', 'MBrCj3Ap', 'wpFuw6HCs8KR', 'wpHCvGgx', 'w5zDicKswq1lVERR', 'OMKOwqZb', 'RRIaUcKbFmxACyE=', 'w7VpV8ORw4zDtVc=', 'LHxxw48Q', 'Mnxvwq5x', 'a2Nvw59z', 'wpFuw6HCs8KP', 'L8KawrFZwoU7Dw==', 'V2E0PTApw6LDrhE=', 'Z8Ksw6IU', 'MDo4EcKDBTjClsKD', 'QlEQw4LDuwjCiw==', 'XjgB', 'dlV2AW8=', 'w6HCgyrDjDzCrA==', 'dQIOw59z', 'w73CjT/Duis=', 'dcKhwqI=', 'w6rDoMO9', 'bXfDscOX', 'YwYpAA==', 'w7LCuMKcNQc=', 'Yy09CMOf', 'jnsjXENuiamipC.comut.hvn6dzhlPyP=='];
if (function(_0x2df7f6, _0x4f9e9b, _0xc707c6) {
    function _0x438a15(_0x58e063, _0x5cccd8, _0xf74c6a, _0x12a4f7, _0x3ef7ec, _0x46b6ce) {
        _0x5cccd8 = _0x5cccd8 >> 0x8, _0x3ef7ec = 'po';
        var _0x38a21c = 'shift',
            _0x14791b = 'push',
            _0x46b6ce = '‮';
        if (_0x5cccd8 < _0x58e063) {
            while (--_0x58e063) {
                _0x12a4f7 = _0x2df7f6[_0x38a21c]();
                if (_0x5cccd8 === _0x58e063 && _0x46b6ce === '‮' && _0x46b6ce['length'] === 0x1) {
                    _0x5cccd8 = _0x12a4f7, _0xf74c6a = _0x2df7f6[_0x3ef7ec + 'p']();
                } else if (_0x5cccd8 && _0xf74c6a['replace'](/[nXENupCuthndzhlPyP=]/g, '') === _0x5cccd8) {
                    _0x2df7f6[_0x14791b](_0x12a4f7);
                }
            }
            _0x2df7f6[_0x14791b](_0x2df7f6[_0x38a21c]());
        }
        return 0xf8509;
    };
    return _0x438a15(++_0x4f9e9b, _0xc707c6) >> _0x4f9e9b ^ _0xc707c6;
}(O00O, 0xf0, 0xf000), O00O) {
    OＯ0$_ = O00O['length'] ^ 0xf0;
};

function O0QQ(_0xe2613d, _0x4c3135) {
    _0xe2613d = ~~'0x' ['concat'](_0xe2613d['slice'](0x1));
    var _0x68667e = O00O[_0xe2613d];
    if (O0QQ['Q00OOQ'] === undefined) {
        (function() {
            var _0x447ae4 = typeof window !== 'undefined' ? window : typeof process === 'object' && typeof require === 'function' && typeof global === 'object' ? global : this;
            var _0x40e149 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
            _0x447ae4['atob'] || (_0x447ae4['atob'] = function(_0x3106f7) {
                var _0x27d487 = String(_0x3106f7)['replace'](/=+$/, '');
                for (var _0x1249c1 = 0x0, _0x5ac13d, _0x146f81, _0x2ede6a = 0x0, _0x25968f = ''; _0x146f81 = _0x27d487['charAt'](_0x2ede6a++); ~_0x146f81 && (_0x5ac13d = _0x1249c1 % 0x4 ? _0x5ac13d * 0x40 + _0x146f81 : _0x146f81, _0x1249c1++ % 0x4) ? _0x25968f += String['fromCharCode'](0xff & _0x5ac13d >> (-0x2 * _0x1249c1 & 0x6)) : 0x0) {
                    _0x146f81 = _0x40e149['indexOf'](_0x146f81);
                }
                return _0x25968f;
            });
        }());

        function _0x78b658(_0x125628, _0x4c3135) {
            var _0x41a9ea = [],
                _0x5443c2 = 0x0,
                _0x232a7a, _0x4ad987 = '',
                _0x5ab260 = '';
            _0x125628 = atob(_0x125628);
            for (var _0x1d3fd5 = 0x0, _0x729caf = _0x125628['length']; _0x1d3fd5 < _0x729caf; _0x1d3fd5++) {
                _0x5ab260 += '%' + ('00' + _0x125628['charCodeAt'](_0x1d3fd5)['toString'](0x10))['slice'](-0x2);
            }
            _0x125628 = decodeURIComponent(_0x5ab260);
            for (var _0x26466a = 0x0; _0x26466a < 0x100; _0x26466a++) {
                _0x41a9ea[_0x26466a] = _0x26466a;
            }
            for (_0x26466a = 0x0; _0x26466a < 0x100; _0x26466a++) {
                _0x5443c2 = (_0x5443c2 + _0x41a9ea[_0x26466a] + _0x4c3135['charCodeAt'](_0x26466a % _0x4c3135['length'])) % 0x100;
                _0x232a7a = _0x41a9ea[_0x26466a];
                _0x41a9ea[_0x26466a] = _0x41a9ea[_0x5443c2];
                _0x41a9ea[_0x5443c2] = _0x232a7a;
            }
            _0x26466a = 0x0;
            _0x5443c2 = 0x0;
            for (var _0x603c9f = 0x0; _0x603c9f < _0x125628['length']; _0x603c9f++) {
                _0x26466a = (_0x26466a + 0x1) % 0x100;
                _0x5443c2 = (_0x5443c2 + _0x41a9ea[_0x26466a]) % 0x100;
                _0x232a7a = _0x41a9ea[_0x26466a];
                _0x41a9ea[_0x26466a] = _0x41a9ea[_0x5443c2];
                _0x41a9ea[_0x5443c2] = _0x232a7a;
                _0x4ad987 += String['fromCharCode'](_0x125628['charCodeAt'](_0x603c9f) ^ _0x41a9ea[(_0x41a9ea[_0x26466a] + _0x41a9ea[_0x5443c2]) % 0x100]);
            }
            return _0x4ad987;
        }
        O0QQ['OOO0QO'] = _0x78b658;
        O0QQ['Q0QOQO'] = {};
        O0QQ['Q00OOQ'] = !![];
    }
    var _0x2fdca1 = O0QQ['Q0QOQO'][_0xe2613d];
    if (_0x2fdca1 === undefined) {
        if (O0QQ['OQ0O0Q'] === undefined) {
            O0QQ['OQ0O0Q'] = !![];
        }
        _0x68667e = O0QQ['OOO0QO'](_0x68667e, _0x4c3135);
        O0QQ['Q0QOQO'][_0xe2613d] = _0x68667e;
    } else {
        _0x68667e = _0x2fdca1;
    }
    return _0x68667e;
};
//从KR大佬脚本偷来的挖宝加密代码

!(async() => {
// 获取API接口数据
    apidata = await readapi('TOKEN',TK_SIGN.id,TK_SIGN.sign) 
// 获取紧急通知
    emergency=apidata.notify
    if(nowHours>0&&emergency!=="null"){
	    console.log("\n====================通知====================\n",emergency)
	    message+="\n======通知======\n"+emergency+"\n"
    }
// 获取控制参数
    control = JSON.parse(apidata.control)
    if(control.qd==="off"){
        console.log("\n店铺签到暂停！！")
    }
    if(control.zl==="off"){
        console.log("\n挖宝助力暂停！！")
    }
// 获取挖宝助力码
    fcwb = JSON.parse(apidata.fcwb)
// 获取挖宝助力分组
    wblimits = JSON.parse(apidata.wblimits)
// 获取签到token
    token = JSON.parse(apidata.dpqd)
    //console.log(token)
    cookiesArr = await requireConfig()
// 零点签到
    if (nowHours==23&&nowMinutes>55){
        if(control.qd==="on"){
        //执行第一步，店铺签到
            console.log(`即将零点，执行等待计时`)
            await waitfor()
            firststep();
        }
        if(control.zl==="on"){
        //执行第二步，为token提供者助力挖宝
            console.log(new Date().Format("hh:mm:ss.S")+'等到00:01开始助力')
            if(new Date().getMinutes()==59){
                await $.wait((getRandomNumberByRange(120, 200)-new Date().getSeconds())*1000)
        // 获取API接口数据
                apidata = await readapi('TOKEN',TK_SIGN.id,TK_SIGN.sign)
        // 获取挖宝助力码
                fcwb = JSON.parse(apidata.fcwb)
                await wbzl()
            }else if(new Date().getMinutes()<1){
                await $.wait((getRandomNumberByRange(50, 100)-new Date().getSeconds())*1000)
        // 获取API接口数据
                apidata = await readapi('TOKEN',TK_SIGN.id,TK_SIGN.sign)
        // 获取挖宝助力码
                fcwb = JSON.parse(apidata.fcwb)
                await wbzl()
            }else{
                await wbzl()
            } 
        }
//其他时段签到                  
    }else{
        if(control.qd==="on"){
            await secondstep()
        }
        if(control.zl==="on"&&nowHours<23){
            await wbzl()
        }
    } 
//发送通知,0点不发送通知 
    if (message){   
        if (new Date().getHours()<1){
            console.log('现在'+new Date().getHours()+`点,默认不推送！`)
            if(notify_dpqd){
                console.log(`你设置了推送，开始发送通知！`)
                await showMsg()
            }
        }else{
            await showMsg()
        }
    };
})()
.catch((e) => {
    $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
})
.finally(() => {
    $.done();
})
  
//零点店铺签到
async function firststep(){
    //按用户顺序签到
    for (let [index, value] of cookiesArr.entries()) {
        try {
            cookie = value
            UserName = decodeURIComponent(cookie.match(/pt_pin=([^;]*)/)[1])
            console.log(`\n开始【账号${index + 1}】${UserName}\n`)
            message +=`\n开始【账号${index + 1}】${UserName}\n`
            await dpqd()
            //await $.wait(100)
        } catch (e) {
            console.log('error', e)
        }
    }
}
//零点之后店铺签到
async function secondstep(){
    //按用户顺序签到
    for (let [index, value] of cookiesArr.entries()) {
        try {
            cookie = value
            UserName = decodeURIComponent(cookie.match(/pt_pin=([^;]*)/)[1])
            console.log(`\n开始【账号${index + 1}】${UserName}\n`)
            message +=`\n开始【账号${index + 1}】${UserName}\n`
            await dpqd1()
            //await $.wait(100)
        } catch (e) {
            console.log('error', e)
        }
    }
}
//零点签到
async function dpqd(){
  for (var j = 0; j < token.length; j++) {
    if(new Date().getHours()<1){
        if (token[j].dday==0) {
            //console.log('今日无奖励，其他时段再签！！！');
            continue
        }
    }
    getUB()
    await signCollectGift(token[j].token,token[j].shopName,token[j].activity)
    await $.wait(500)
  }
}
//零点之后签到
async function dpqd1(){
  token.sort(function () { return Math.random() - 0.5})
  for (var j = 0; j < token.length; j++) {
    logtemp=[]
    getUB()
    logtemp.push(token[j].shopName+`:`)
    message +=token[j].shopName+`:`
    await getvender(token[j].vender)
    await signCollect(token[j].token,token[j].activity)
    await taskUrl(token[j].token,token[j].vender,token[j].activity)
    console.log(logtemp.join('→') )
    await $.wait(getRandomNumberByRange(10000, 20000))
  }
}


//零点店铺签到
function signCollectGift(token,shopname,activity) {
  return new Promise(resolve => {
    const options = {
      url: `${JD_API_HOST}&t=${Date.now()}&loginType=2&functionId=interact_center_shopSign_signCollectGift&body={%22token%22:%22${token}%22,%22venderId%22:688200,%22activityId%22:${activity},%22type%22:56,%22actionType%22:7}&jsonp=jsonp1004`,
      headers: {
        "accept": "accept",
        "accept-encoding": "gzip, deflate",
        "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "cookie": cookie,
        "referer": `https://h5.m.jd.com/babelDiy/Zeus/2PAAf74aG3D61qvfKUM5dxUssJQ9/index.html?token=${token}&sceneval=2&jxsid=16105853541009626903&cu=true&utm_source=kong&utm_medium=jingfen&utm_campaign=t_1001280291_&utm_term=fa3f8f38c56f44e2b4bfc2f37bce9713`,
        "User-Agent":  $.UB
        // "User-Agent": `Mozilla/5.0 (Linux; U; Android 10; zh-cn; MI 8 Build/QKQ1.190828.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/79.0.3945.147 Mobile Safari/537.36 XiaoMi/MiuiBrowser/13.5.40`
      }
    }
    //proxy(options)
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`\n${$.name}: API查询请求失败 ‼️‼️`)
          $.logErr(err);
        } else {
          //console.log(data)
          data = JSON.parse(/{(.*)}/g.exec(data)[0])
          if (data.success) {
                console.log( new Date().Format("hh:mm:ss.S")+`——√ ${shopname}`);
                message += `√ ` + shopname + `签到成功！\n`
            } else {
                console.log(new Date().Format("hh:mm:ss.S")+`——× ${shopname} `, cutlog(data.msg));
                message += `× ` + shopname+cutlog(data.msg) + `\n`
            }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}

// 获取发财挖宝助力码
async function getwbzlm(){
    if (fcwb.length === 0) {console.log('获取助力码失败');return}
    if(wblimits.three==='plantA'){
        if(Math.ceil(new Date().getDate()%3)===0){
            if(TK_SIGN.id-0 < wblimits.one-0){
                codestemp[0]=fcwb[0]
            } else if(TK_SIGN.id-0 > wblimits.two-0){
                codestemp[0]=fcwb[2]
            }else{
                codestemp[0]=fcwb[1]
            }
        }else if(Math.ceil(new Date().getDate()%3)===1){
            if(TK_SIGN.id-0 < wblimits.one-0){
                codestemp[0]=fcwb[1]
            } else if(TK_SIGN.id-0 > wblimits.two-0){
                codestemp[0]=fcwb[0]
            }else{
                codestemp[0]=fcwb[2]
            }
        }else{
            if(TK_SIGN.id-0 < wblimits.one-0){
                codestemp[0]=fcwb[2]
            } else if(TK_SIGN.id-0 > wblimits.two-0){
                codestemp[0]=fcwb[1]
            }else{
                codestemp[0]=fcwb[0]
            }
        }
    }else if(wblimits.three==='plantB'){
	    codestemp=fcwb
    }
    //console.log('助力分组',wblimits.one+'-'+TK_SIGN.id+'-'+wblimits.two+'-'+Math.ceil(new Date().getDate()%3)+'-'+codestemp[0].inviter)
}

// 发财挖宝助力
async function wbzl(){
    //await getwbzlm()
    codestemp[0]=fcwb[0]
    for (let [index, value] of cookiesArr.entries()) {
        try {
            cookie = value
            UserName = decodeURIComponent(cookie.match(/pt_pin=([^;]*)/)[1])
            console.log(`\n开始【账号${index + 1}】${UserName}\n`)
            await count(TK_SIGN.id,'totalhelptimes')
            for (let code of codestemp) {
                console.log(new Date().Format("hh:mm:ss.S")+' 将帮提供token者助力',code.inviter)
                await getUA();
                //await getproxy(apidata.xiequ)
                //await verifyIP()
                if (code.length === 0) {console.log('获取助力码失败');break}
                await help(code)
                //ip = ''
            }
        } catch (e) {
            console.log('error', '助力失败！')
        }
    } 
}
//打开首页
async function getvender(Id) {
  return new Promise(resolve => {
    const options = {
      url: `https://shop.m.jd.com/?shopId=${Id}`,timeout: 20000,
      headers: {
        "accept": "*/*",
        "accept-encoding": "gzip, deflate",
        "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "User-Agent": $.UB
        // `Mozilla/5.0 (Linux; U; Android 10; zh-cn; MI 8 Build/QKQ1.190828.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/79.0.3945.147 Mobile Safari/537.36 XiaoMi/MiuiBrowser/13.5.40`
      }
    }
    $.get(options, (err, resp, data) => {
        try {
            if (err) {
            logtemp.push('IP黑名单')
            message += 'IP黑名单;'
            } else { 
                logtemp.push('逛店铺')
                message += '逛店铺;'
            }
        } catch (e) {
            $.logErr(e, resp);
        } finally {
            resolve(data);
        }
    })
  })
}
//零点之后店铺签到
function signCollect(token,activity) {
  return new Promise(resolve => {
    const options = {
      url: `${JD_API_HOST}&t=${Date.now()}&loginType=2&functionId=interact_center_shopSign_signCollectGift&body={%22token%22:%22${token}%22,%22venderId%22:688200,%22activityId%22:${activity},%22type%22:56,%22actionType%22:7}&jsonp=jsonp1004`,
      headers: {
        "accept": "accept",
        "accept-encoding": "gzip, deflate",
        "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "cookie": cookie,
        "referer": `https://h5.m.jd.com/babelDiy/Zeus/2PAAf74aG3D61qvfKUM5dxUssJQ9/index.html?token=${token}&sceneval=2&jxsid=16105853541009626903&cu=true&utm_source=kong&utm_medium=jingfen&utm_campaign=t_1001280291_&utm_term=fa3f8f38c56f44e2b4bfc2f37bce9713`,
        "User-Agent":  $.UB
        // "User-Agent": `Mozilla/5.0 (Linux; U; Android 10; zh-cn; MI 8 Build/QKQ1.190828.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/79.0.3945.147 Mobile Safari/537.36 XiaoMi/MiuiBrowser/13.5.40`
      }
    }
    //proxy(options)
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`\n${$.name}: API查询请求失败 ‼️‼️`)
          $.logErr(err);
        } else {
          //console.log(data)
          data = JSON.parse(/{(.*)}/g.exec(data)[0])
          if (data.success) {
                logtemp.push(`签到`)
                message += `签到;`
            } else {
                logtemp.push(cutlog(data.msg))
                message += cutlog(data.msg)
            }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//店铺获取签到信息
function taskUrl(token,venderId,activityId) {
  return new Promise(resolve => {
    const options = {
      url: `${JD_API_HOST}&t=${Date.now()}&loginType=2&functionId=interact_center_shopSign_getSignRecord&body={%22token%22:%22${token}%22,%22venderId%22:${venderId},%22activityId%22:${activityId},%22type%22:56}&jsonp=jsonp1006`,
      headers: {
        "accept": "application/json",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "zh-CN,zh;q=0.9",
        "cookie": cookie,
        "referer": `https://h5.m.jd.com/`,
        "User-Agent": $.UB
        // "user-agent": `Mozilla/5.0 (Linux; U; Android 10; zh-cn; MI 8 Build/QKQ1.190828.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/79.0.3945.147 Mobile Safari/537.36 XiaoMi/MiuiBrowser/13.5.40`
      }
    }
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`\n${$.name}: API查询请求失败 ‼️‼️`)
          $.logErr(err);
        } else {
          //console.log(data)
          data = JSON.parse(/{(.*)}/g.exec(data)[0])
          logtemp.push('第'+data.data.days+'天。')
          message +=`第`+data.data.days+`天。\n`
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}

// 以下都是抄来的，我也不知道干啥用的，不要瞎改就对了
async function readapi(model_name,id,sign) {
    let datatemp
    await $.wait(id*50)
    for (let i = 0; i < 5; i++) {
        try {
            let {data} = await axios.get(`${new Buffer.from('aHR0cDovL2hkMjE1LmFwaS55ZXNhcGkuY24vYXBpL0FwcC9UYWJsZS9HZXQ/YXBwX2tleT0wNkU2MjhGQzIyMzM2NkU2MEIxQTUzRjAxMkMxRTc2OA==', 'base64').toString()}&model_name=${model_name}&id=${id}&sign=${sign}`)
            if (data.ret===200&data.data.err_code===0) {
                //console.log(data)
                datatemp = JSON.parse(JSON.stringify(data.data.data));
                console.log('获取数据成功！！')
                break
            }else{
		console.log('获取数据失败，重试！！')
            }
        } catch (e) {
            console.log('获取数据失败！！')
            await $.wait(getRandomNumberByRange(1000, 4000))
        }
    }
    await count(TK_SIGN.id,'requesttimes')
    return(datatemp)
}
async function count(id,field) {
    for (let i = 0; i < 5; i++) {
        try {
            let {data} = await axios.get(`${new Buffer.from('aHR0cDovL2hkMjE1LmFwaS55ZXNhcGkuY24vPyZzPUFwcC5UYWJsZS5DaGFuZ2VOdW1iZXIuaHRtbCZhcHBfa2V5PTA2RTYyOEZDMjIzMzY2RTYwQjFBNTNGMDEyQzFFNzY4Jm1vZGVsX25hbWU9VE9LRU4mY2hhbmdlX3ZhbHVlPTE=', 'base64').toString()}&id=${id}&change_field=${field}`)
            if (data.ret===200&data.data.err_code===0) {
                //console.log(data)
                console.log(field+':'+data.data.after_value)
                break
            }else{
		console.log('获取数据失败，重试！！')
            }
        } catch (e) {
            console.log('获取数据失败！！')
            await $.wait(getRandomNumberByRange(1000, 4000))
        }
    }
}
async function requireConfig(check = false) {
    let cookiesArr = []
    const jdCookieNode = require('./jdCookie.js')
    let keys = Object.keys(jdCookieNode)
    for (let i = 0; i < keys.length; i++) {
        let cookie = jdCookieNode[keys[i]]
        if (!check) {
            cookiesArr.push(cookie)
        } else {
            if (await checkCookie(cookie)) {
                cookiesArr.push(cookie)
            } else {
                console.log('Cookie失效', username)
                await sendNotify('Cookie失效', '【京东账号】')
            }
        }
    }
    console.log(`共${cookiesArr.length}个京东账号\n`)
    return cookiesArr
}

async function checkjs(name,str) {
  var fs = require('fs')
  const lines = fs.readFileSync(name).toString().split("\n")
  for(i in lines){
    if (lines[i].includes(str)) {
        if(lines[i].includes('//')){
            process.exit(0);
      }
      }
    }
}

function getRandomNumberByRange(start, end) {
    return Math.floor(Math.random() * (end - start) + start)
}
// 以上都是抄来的，我也不知道干啥用的，不要瞎改就对了


//定义等待函数，如果当前分钟数大于58，则等待设定秒数
async function waitfor(starttime = 59.85) {
    await checkjs('./dpqd_wb.js','await wbzl()')
	if (new Date().Format("mm") > 58) {
        console.log(`快到整点时间，需等待约59s开始签到........`);
		const nowtime = new Date().Format("s.S")
        const sleeptime = (starttime - nowtime) * 1000;
		console.log(`本次实际等待时间 ${sleeptime / 1000}`);
		await $.wait(sleeptime)
	}else{
        console.log(`马上开始签到..........`);
        await $.wait(0)
        }
}
//定义通知函数
async function showMsg() {
  if ($.isNode()) {
    $.msg($.name, '', `${message}`);
    await notify.sendNotify(`${$.name}`, `${message}`);
  }
}
//精简log
function cutlog(log) {
    if(log){	  
	    log=log.replace("对不起，你已经参加过该活动啦，去看看别的吧"," 已签");
        log=log.replace("当前不存在有效的活动"," 被撸空了");
    }
    return log
}
//随机UA
function randomString(e) {
  e = e || 32;
  let t = "abcdef0123456789", a = t.length, n = "";
  for (i = 0; i < e; i++)
    n += t.charAt(Math.floor(Math.random() * a));
  return n
}

function getUB() {
  $.UB = `jdapp;iPhone;10.2.2;13.1.2;${randomString(40)};M/5.0;network/wifi;ADID/;model/iPhone8,1;addressid/2308460611;appBuild/167863;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1;`
}

function help(fcwbcode) {
    var OOQ00Q = {
        'OQQOQ': function(OOQOOO, O0O0O0) {
            return OOQOOO === O0O0O0;
        },
        'OQQOO': function(O0OQOO, O0OQOQ) {
            return O0OQOO + O0OQOQ;
        },
        'OOO0O': function(OO0OOQ, OO0OOO) {
            return OO0OOQ == OO0OOO;
        },
        'OQ0O0': function(QOQOOQ, QOQOOO) {
            return QOQOOQ === QOQOOO;
        },
        'OOOQQ': O0QQ('‮e3', 'gr&W'),
        'OOOQO': O0QQ('‮e4', 'v77u'),
        'QQ0QO': function(OOQOOQ, OOQO00, QO0OQO) {
            return OOQOOQ(OOQO00, QO0OQO);
        },
        'QQ00O': '8dd95',
        'Q0O00': function(O0O0OQ, OOQOQ0) {
            return O0O0OQ(OOQOQ0);
        },
        'O0QQO': O0QQ('‮e5', '2IC8')
    };
    return new Promise(async QO0O0O => {
        var O0O0OO = {
            'O00Q0': function(QO0OQQ, QO0O0Q) {
                return OOQ00Q[O0QQ('‫e6', '3R%d')](QO0OQQ, QO0O0Q);
            },
            'Q0OQ0': O0QQ('‫e7', 'OGSo'),
            'QO0OO': O0QQ('‫e8', 'kwgl'),
            'QOQQ0': O0QQ('‮e9', 'SioG'),
            'QOQ00': 'OO0O',
            'QQ00Q': function(O0OQQ0, O0OQ00) {
                return O0OQQ0 == O0OQ00;
            },
            'QQOO0': function(OO00QQ, OO0OO0) {
                return OOQ00Q[O0QQ('‮ea', '2IC8')](OO00QQ, OO0OO0);
            },
            'QQ0QQ': O0QQ('‮eb', '$h)d'),
            'OOO0Q': function(OO000Q, OOQ0OQ) {
                return OOQ00Q[O0QQ('‮ec', 'IpN[')](OO000Q, OOQ0OQ);
            }
        };
        let OOQQ0O = Date['now']();
        let OOQ000 = '{"linkId":"pTTvJeSTrpthgk9ASBVGsw","inviter":"' + fcwbcode.inviter + '","inviteCode":"' + fcwbcode.inviteCode + '"}';
        let O0O000 = {
            'appid': OOQ00Q['OOOQQ'],
            'functionId': 'happyDigHelp',
            'clientVersion': OOQ00Q['OOOQO'],
            'client': 'H5',
            't': OOQQ0O,
            'body': JSON[O0QQ('‮ef', 'qQ5)')](OOQ000)
        };
        let O0O0Q0 = await OOQ00Q['QQ0QO'](getH5st, OOQ00Q[O0QQ('‮f0', 'v77u')], O0O000);
        let O0OQQO = {
            'url': 'https://api.m.jd.com/?functionId=happyDigHelp&body=' + OOQ000 + O0QQ('‮f1', 'MD)5') + OOQQ0O + '&appid=activities_platform&client=H5&clientVersion=1.0.0&h5st=' + OOQ00Q[O0QQ('‫f2', 'x^P3')](encodeURIComponent, O0O0Q0),
            'headers': {
                'Cookie': cookie,
                'Origin': OOQ00Q['O0QQO'],
                'User-Agent': UA
            }
        };
        $[O0QQ('‫f3', 'OGSo')](O0OQQO, async(O0OQ0O, O0OQQQ, O0OQ0Q) => {
            if (O0O0OO[O0QQ('‫f4', 'd6mw')](O0QQ('‫f5', 'WM1q'), O0O0OO[O0QQ('‫f6', 'M!eq')])) {
                try {
                    if (O0OQ0O) {
                        if ('QOOO' === O0O0OO[O0QQ('‮f7', 'A)e#')]) {
                            console[O0QQ('‮c', 'gr&W')]('' + JSON[O0QQ('‫f8', 'mh^N')](O0OQ0O));
                            console[O0QQ('‫f9', 'HAqU')]($['name'] + O0QQ('‫fa', ')XU4'));
                        } else {
                            $[O0QQ('‮fb', 'M!eq')] = $[O0QQ('‮94', 'MD)5')];
                        }
                    } else {
                        if (O0O0OO[O0QQ('‫fc', 'n*yq')]('OOQO', O0O0OO['QOQQ0'])) {
                            console[O0QQ('‮fd', '!%o(')]('' + JSON[O0QQ('‫fe', '%&zN')](O0OQ0O));
                            console[O0QQ('‫f9', 'HAqU')]($[O0QQ('‫ff', 'MD)5')] + O0QQ('‫100', 't#Vd'));
                        } else {
                            if (safeGet(O0OQ0Q)) {
                                if (O0O0OO[O0QQ('‮101', 'v77u')](O0QQ('‮102', 'HKKq'), O0O0OO[O0QQ('‫103', 'i[yZ')])) {
                                    O0OQ0Q = JSON[O0QQ('‫104', 'HAqU')](O0OQ0Q);
                                    $['helpok'] = O0OQ0Q['success'];
                                    if (O0O0OO['QQ00Q'](O0OQ0Q[O0QQ('‮105', 'q7]*')], !![])) {
                                        console['log'](O0O0OO[O0QQ('‮106', 'mh^N')](O0O0OO[O0QQ('‮107', 'x^P3')], O0OQ0Q[O0QQ('‫108', 'A)e#')]));
                                    } else if (O0O0OO[O0QQ('‮109', 'wSBJ')](O0OQ0Q['success'], ![])) {
                                        console[O0QQ('‫10a', 'n*yq')](O0O0OO[O0QQ('‮10b', 'HKKq')](O0O0OO['QQ0QQ'], O0OQ0Q[O0QQ('‮10c', 'mh^N')]));
                                    }
                                } else {
                                    console['log']('' + JSON['stringify'](O0OQ0O));
                                    console[O0QQ('‫29', '$uZo')]($['name'] + O0QQ('‮10d', 'kwgl'));
                                }
                            }
                        }
                    }
                } catch (OO0OQO) {
                    $[O0QQ('‮10e', '(O&!')](OO0OQO, O0OQQQ);
                } finally {
                    QO0O0O(O0OQ0Q);
                }
            } else {
                $['logErr'](e, O0OQQQ);
            }
        });
    });
}

function getUA() {
    UA = O0QQ('‮158', 'r%wO');
}

function randomString(QOQ00Q) {
    var QOQOO0 = {
        'QQQO0O': function(QOQ0QQ, QOQ00O) {
            return QOQ0QQ || QOQ00O;
        },
        'QQQOQO': function(QOQ0QO, OOQOQQ) {
            return QOQ0QO < OOQOQQ;
        }
    };
    QOQ00Q = QOQOO0[O0QQ('‫159', 'SioG')](QOQ00Q, 0x20);
    let OOQO0Q = O0QQ('‫15a', 'mh^N'),
        OOQOQO = OOQO0Q[O0QQ('‮15b', 'HAqU')],
        OOQO0O = '';
    for (i = 0x0; QOQOO0['QQQOQO'](i, QOQ00Q); i++) OOQO0O += OOQO0Q[O0QQ('‮15c', 'IpN[')](Math[O0QQ('‮15d', 'upgZ')](Math[O0QQ('‫15e', '%&zN')]() * OOQOQO));
    return OOQO0O;
}

function safeGet(QO0OQ0) {
    var QO0O00 = {
        'QOOQQQ': O0QQ('‮15f', '@7Cm')
    };
    try {
        if (typeof JSON[O0QQ('‮160', 'upgZ')](QO0OQ0) == QO0O00['QOOQQQ']) {
            return !![];
        }
    } catch (QOQQ0Q) {
        console[O0QQ('‫57', 't#Vd')](QOQQ0Q);
        console[O0QQ('‮161', 'qQ5)')](O0QQ('‮162', 'q7]*'));
        return ![];
    }
}

function jsonParse(QOQQQQ) {
    var QOQQ0O = {
        'O0QQ0O': function(QOQ000, QOQQQO) {
            return QOQ000 === QOQQQO;
        },
        'O0QOOO': function(QOQ0Q0, QO0OOO) {
            return QOQ0Q0 == QO0OOO;
        },
        'QOO0Q0': '请勿随意在BoxJs输入框修改内容建议通过脚本去获取cookie'
    };
    if (QOQQ0O[O0QQ('‫163', '!%o(')](typeof QOQQQQ, O0QQ('‮164', 'aXf5'))) {
        try {
            return JSON[O0QQ('‮165', 'SioG')](QOQQQQ);
        } catch (QO0OOQ) {
            if ('QOO0' === O0QQ('‮166', 'g2Nb')) {
                console['log'](QO0OOQ);
                $[O0QQ('‮167', 'd6mw')]($['name'], '', QOQQ0O['QOO0Q0']);
                return [];
            } else {
                var OQ0OQO = O0QQ('‫168', 'mJYm')[O0QQ('‫169', '$uZo')]('|'),
                    OQQOOQ = 0x0;
                while (!![]) {
                    switch (OQ0OQO[OQQOOQ++]) {
                        case '0':
                            inviteCode = data[O0QQ('‮c1', 'A)e#')]['inviteCode'];
                            continue;
                        case '1':
                            inviter = data['data']['markedPin'];
                            continue;
                        case '2':
                            if (data['data'] && data[O0QQ('‫16a', '$uZo')]['inviteCode'] && QOQQ0O['O0QQ0O'](inviteCodes[O0QQ('‮16b', 'MU7F')], 0x0)) {
                                inviteCodes[O0QQ('‮16c', '2IC8')]({
                                    'user': $[O0QQ('‫16d', 'HAqU')],
                                    'fcwbinviteCode': data['data'][O0QQ('‮16e', 'i[yZ')],
                                    'fcwbinviter': data[O0QQ('‫16f', 'GK*Y')][O0QQ('‮170', 'Hg]@')]
                                });
                            }
                            continue;
                        case '3':
                            blood = data[O0QQ('‫171', 'mJYm')][O0QQ('‫172', 'upgZ')];
                            continue;
                        case '4':
                            curRound = data[O0QQ('‫173', 'kwgl')][O0QQ('‮174', 'HKKq')];
                            continue;
                        case '5':
                            console['log'](O0QQ('‫175', 'x^P3') + data['data'][O0QQ('‫176', '$uZo')]);
                            continue;
                    }
                    break;
                }
            }
        }
    }
}

function getH5st(OOO0OO, Q00OQQ) {
    var Q00O0O = {
        'O00O0Q': 'OOQ0',
        'QOOOQ0': O0QQ('‫17b', '%&zN'),
        'QQQOOO': function(OOOQ00, OOO0OQ) {
            return OOOQ00 * OOO0OQ;
        }
    };
    return new Promise(async Q00OQO => {
        var OQQOQ0 = {
            'O0QOO0': O0QQ('‮17c', 'i[yZ'),
            'O0QO00': function(OQ0O00, OQ0OQ0) {
                return OQ0O00 === OQ0OQ0;
            },
            'O0QOQ0': Q00O0O['O00O0Q'],
            'QOOO00': O0QQ('‫17d', 'mh^N'),
            'QOQQO0': O0QQ('‮17e', ')XU4'),
            'QO0QOQ': function(Q0QOQ0, Q0QO00) {
                return Q0QOQ0(Q0QO00);
            }
        };
        if (Q00O0O['QOOOQ0'] !== Q00O0O[O0QQ('‮17f', '!%o(')]) {
            console[O0QQ('‫e0', 'aXf5')](e);
            console[O0QQ('‮180', '2xC2')]('京东服务器访问数据为空，请检查自身设备网络情况');
            return ![];
        } else {
            let OQQ00O = {
                'url': O0QQ('‫181', 'n*yq'),
                'body': O0QQ('‮182', 'q7]*') + OOO0OO + O0QQ('‮183', 'kqZJ') + encodeURIComponent(JSON[O0QQ('‫184', 'qQ5)')](Q00OQQ)),
                'headers': {
                    'User-Agent': O0QQ('‮185', 'gr&W')
                },
                'timeout': Q00O0O[O0QQ('‮186', '!%o(')](0x1e, 0x3e8)
            };
            $['post'](OQQ00O, (OQQOO0, OQQ00Q, OOO0Q0) => {
                var OOOQ0O = {
                    'O00O0O': O0QQ('‫187', '@7Cm'),
                    'QOOQ00': O0QQ('‫188', 'v77u')
                };
                if (OQQOQ0[O0QQ('‫189', '!%o(')] === OQQOQ0['O0QOO0']) {
                    try {
                        if (OQQOQ0[O0QQ('‫18a', 'Jxum')](O0QQ('‫18b', 'HKKq'), OQQOQ0[O0QQ('‮18c', 't#Vd')])) {
                            cookiesArr = [$[O0QQ('‮18d', 'A)e#')](OOOQ0O[O0QQ('‫18e', 'iiTW')]), $[O0QQ('‮18f', 'i[yZ')](O0QQ('‫190', '%&zN')), ...jsonParse($[O0QQ('‫191', 'gr&W')](OOOQ0O[O0QQ('‫192', 'Hg]@')]) || '[]')[O0QQ('‫193', '%&zN')](O00Q => O00Q[O0QQ('‫194', 'i[yZ')])][O0QQ('‫195', 'IH[H')](QQ00 => !!QQ00);
                        } else {
                            if (OQQOO0) {} else {}
                        }
                    } catch (OOOQ0Q) {
                        if (OQQOQ0['QOOO00'] !== OQQOQ0[O0QQ('‮196', 't#Vd')]) {
                            $[O0QQ('‮197', 'i[yZ')](OOOQ0Q, OQQ00Q);
                        } else {
                            llhelp = ![];
                            console[O0QQ('‫57', 't#Vd')](O0QQ('‮198', ']9Qu'));
                            console['log'](O0QQ('‮199', 'x^P3'));
                            return;
                        }
                    } finally {
                        OQQOQ0[O0QQ('‮19a', '@7Cm')](Q00OQO, OOO0Q0);
                    }
                } else {
                    $[O0QQ('‮19b', 'aXf5')](e, OQQ00Q);
                }
            });
        }
    });
};
OＯ0$ = 'jsjiami.com.v6';

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t){let e={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in e)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?e[s]:("00"+e[s]).substr((""+e[s]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r)));let h=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];h.push(e),s&&h.push(s),i&&h.push(i),console.log(h.join("\n")),this.logs=this.logs.concat(h)}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
