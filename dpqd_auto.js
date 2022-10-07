/**
 * cron: 59 20,23 * * *
 * 增加变量TK_SIGN_WAIT，控制零点店铺签到间隔，单位是秒，不是毫秒。默认是1s。
 * 定时不要增加，单日请求次数用完你就获取不到数据了。青龙配置文件随机延迟取消即RandomDelay=""。
 * 想跑几个号自己在定时任务命令后面加限制,如何限制去百度，问我也不知道，脚本内部不做限制。
 * 默认不推送通知，可以添加环境变量NOTIFY_DPQD为true开启，能不能签到豆查询就好了，签到通知与否没关系。
 * 环境变量名称：TK_SIGN，环境变量值：{"id":*,"sign":"************************"}
 * 用上面的环境变量报读取出错则拆分为TK_SIGN_ID和TK_SIGN_SIGN两个变量，对应上面｛｝里的两个值，若不报错则忽略此行。
 * 为防止恶意访问数据，仅加密获取数据接口函数。
*/

let TK_SIGN
if (process.env.TK_SIGN) {
	TK_SIGN = JSON.parse(process.env.TK_SIGN)
}

if (process.env.TK_SIGN_ID&&process.env.TK_SIGN_SIGN) {
	TK_SIGN = {id:process.env.TK_SIGN_ID,sign:process.env.TK_SIGN_SIGN}
}
if (!TK_SIGN) {
	console.log('联系@dpqd_boss获取TK_SIGN.')
	return
}
let interval=1//签到间隔
if (process.env.TK_SIGN_WAIT) {
	interval = process.env.TK_SIGN_WAIT
}
console.log('增加变量TK_SIGN_WAIT，控制零点店铺签到间隔，单位是秒，不是毫秒。默认是1s。')
const $ = new Env('店铺签到（自动更新）');
const notify = $.isNode() ? require('./sendNotify') : '';
const axios = require('axios')
const JD_API_HOST = 'https://api.m.jd.com/api?appid=interCenter_shopSign';
const fs=require('fs');
console.log('当前版本号',Math.trunc(fs.statSync(__dirname).mtimeMs))

let nowHours = new Date().getHours()
let cookiesArr = []
let logtemp=[]
let cookie = ''
let UserName = ''
let message=''
let notify_dpqd = false//true零点签到发送通知，false为不发送通知
let emergency=[]
let apidata
let control
let requesttimes=0
if (process.env.NOTIFY_DPQD){notify_dpqd = process.env.NOTIFY_DPQD} //凌晨签到是否通知，变量设置true则通知，默认不通知，估计影响签到网速，未验证。22点签到通知结果。

let alltoken = []
let tdtoken = []
let msgtemp = ''
let timeout=30000
let retry=false
let retrytimes=3

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

!(async() => {
    console.log(new Date().Format("hh:mm:ss.S"),`开始获取数据，等待${TK_SIGN.id/5}s...`)
	await $.wait(TK_SIGN.id*200)
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
	// 获取签到token
	//alltoken = JSON.parse(apidata.dpqd)
    alltoken = [
	{
		"token": "C513D54B385E592B872FBC0F7F740F6F",
		"vender": 10751162,
		"activity": 11244032,
		"shopName": "宠盟海外(专营)",
		"shopId": 10168476,
		"cprl": [
			{
				"discount": 300,
				"level": 7,
				"type": "红包"
			}
		],
		"signday": 6,
		"dday": 1,
		"dou": 300,
		"type": "红包"
	}
    ]
	cookiesArr = await requireConfig()
	// 零点签到
	if (nowHours==23||nowHours<6){
		//执行第一步，店铺签到
		// 获取今日有奖励token
        console.log(new Date().Format("hh:mm:ss.S"),`开始获取今日有奖励ddtoken！`)
        for (var i = 0; i < alltoken.length; i++) {
            alltoken[i].dday!==0? tdtoken.push(alltoken[i]) : ''
        }
        console.log(tdtoken)
		if(tdtoken.length===0){
			console.log(`今日无奖励！`)
			return
		}
		console.log(`即将零点，执行等待计时`)
		await waitfor(100)
		console.log('零点店铺签到间隔:',interval+'秒!')
		await firststep(tdtoken);
		await count(TK_SIGN.id,'requesttimes',requesttimes)
		//其他时段签到                  
	}else{
		await secondstep(alltoken)
	} 
	//发送通知,6点前不发送通知 
	if (message){   
		if (new Date().getHours()<6){
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
async function firststep(token){
	//按用户顺序签到
	requesttimes++
	for (let [index, value] of cookiesArr.entries()) {
		try {
			cookie = value
			UserName = decodeURIComponent(cookie.match(/pt_pin=([^;]*)/)[1])
			console.log(`\n开始【账号${index + 1}】${UserName}\n`)
			message +=`\n开始【账号${index + 1}】${UserName}\n`
			await dpqd(token)
		} catch (e) {
			console.log('error', e)
		}
	}
}
//零点签到
async function dpqd(token){
	for (var j = 0; j < token.length; j++) {
		await getUA()
		await signCollectGift(token[j])
		await $.wait(interval*1000)
	}
}

//零点之后店铺签到
async function secondstep(token){
	//按用户顺序签到
	for (let [index, value] of cookiesArr.entries()) {
		try {
			msgtemp=''
			cookie = value
			UserName = decodeURIComponent(cookie.match(/pt_pin=([^;]*)/)[1])
			console.log(`\n开始【账号${index + 1}】${UserName}\n`)
			msgtemp +=`\n开始【账号${index + 1}】${UserName}\n`
			token.sort(function () { return Math.random() - 0.5})
			await dpqd1(token)
			if([0].includes(index)){message +=msgtemp+'\n'}
		} catch (e) {
			console.log('error', e)
		}
	}
}
//零点之后签到
async function dpqd1(token){
	for (var j = 0; j < token.length; j++) {
		await getUA()
		logtemp=[]
		logtemp.push(`  No.${j+1}-${token[j].shopName}:`)
		msgtemp +=`\n  No.${j+1}-${token[j].shopName}:`
		await getvender(token[j].shopId)
		await signCollect(token[j].token,token[j].vender,token[j].activity)
		await taskUrl(token[j].token,token[j].vender,token[j].activity)
		console.log(logtemp.join('→') )
		await $.wait(getRandomNumberByRange(5000, 10000))
	}
}
//零点店铺签到
async function signCollectGift(token) {
	for(let i=0;i<retrytimes;i++){
		try {    
			let config = {
				headers: {
                    "accept": "accept",
                    "accept-encoding": "gzip, deflate",
                    "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
					Cookie: cookie,
					"referer": `https://h5.m.jd.com/`,
					"User-Agent":  $.UA
				},
				timeout: timeout
			}
            console.log(config)
			let {status,data} = await axios.get(`${JD_API_HOST}&t=${Date.now()}&loginType=2&functionId=interact_center_shopSign_signCollectGift&body=%7B%22token%22%3A%22${token.token}%22%2C%22venderId%22%3A${token.vender}%2C%22activityId%22%3A${token.activity}%2C%22type%22%3A56%2C%22actionType%22%3A7%7D`,config)
			if(status==200){
				switch (String(data.code)) {
					case '200':
						let info=sollectGift(data.data)
						console.log( new Date().Format("hh:mm:ss.S"),`——(${data.code})同步√ ${token.shopName}${info}`);
						message += `同步√ ${token.shopName}${info}\n`;
						retry=false
						break;
					case '-1':
						console.log(new Date().Format("hh:mm:ss.S"),`——(${data.code})同步× ${token.shopName+cutlog(data.echo)}`);
						message += `同步× ${token.shopName+cutlog(data.echo)} \n`;
						retry=true
						break;
					case '402':
						console.log(new Date().Format("hh:mm:ss.S"),`——(${data.code})同步× ${token.shopName+cutlog(data.msg)}`);
						message += `同步× ${token.shopName+cutlog(data.msg)} \n`;
						retry=false
						break;
					case '403030023':
						console.log(new Date().Format("hh:mm:ss.S"),`——(${data.code})同步× ${token.shopName+cutlog(data.msg)}`);
						message += `同步× ${token.shopName+cutlog(data.msg)} \n`;
						new Date().getMinutes()==0||new Date().getMinutes()==59?retry=true:retry=false
						break;
					default:
						console.log(new Date().Format("hh:mm:ss.S"),`——(${data.code})同步× ${token.shopName}${JSON.stringify(data)}`);
						message += `同步× ${token.shopName} 未知错误，查看日志！\n`;
						retry=true
				}
			}
		} catch (e) {
			console.log('零点店铺签，同步函数','🚫'+e)
		}
		if(!retry){break}else{await $.wait(1234)}
	}
}

function sollectGift(data) {
	let info=''
	let reward,discount,type,status
	for (let i = 0; i < data.length; i++) {
		data[i].level==0?info+= ":日签👉":info+= ":连签👉"+data[i].level+"天,"
		for (let j = 0; j < data[i].prizeList.length; j++) {
			discount = data[i].prizeList[j].discount
			type = data[i].prizeList[j].type
			status = data[i].prizeList[j].status
			if (status==2){
				type==1?reward='优惠券':reward=reward
				type==4?reward='京豆':reward=reward
				type==6?reward='积分':reward=reward
				type==9?reward='满减券':reward=reward
				type==10?reward='e卡':reward=reward
				type==14?reward='红包':reward=reward
				info+= discount+reward+";"
			}
		}
	}
	return info
}
//打开首页
async function getvender(Id) {
	try {
		let config = {
			timeout: timeout
		}
		let {status} = await axios.get(`https://shop.m.jd.com/shop/home?shopId=${Id}`,config)
		//console.log(status)
		if (status===200) {
			logtemp.push('逛店铺')
			msgtemp += '逛店铺;'
		}else{
			logtemp.push('IP黑名单')
			msgtemp += 'IP黑名单;'
		}
	} catch (e) {
		console.log('打开首页失败！！')
	}  
}

//零点之后店铺签到
async function signCollect(token,vender,activity) {
	try {    
		let config = {
			headers: {
				"accept": "accept",
				"accept-encoding": "gzip, deflate",
				"accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
				"cookie": cookie,
				"referer": `https://h5.m.jd.com/babelDiy/Zeus/2PAAf74aG3D61qvfKUM5dxUssJQ9/index.html?token=${token}&sceneval=2&jxsid=16105853541009626903&cu=true&utm_source=kong&utm_medium=jingfen&utm_campaign=t_1001280291_&utm_term=fa3f8f38c56f44e2b4bfc2f37bce9713`,
				"User-Agent":  $.UA
			},
			timeout: timeout
		}
		let {data} = await axios.get(`${JD_API_HOST}&t=${Date.now()}&loginType=2&functionId=interact_center_shopSign_signCollectGift&body={%22token%22:%22${token}%22,%22venderId%22:${vender},%22activityId%22:${activity},%22type%22:56,%22actionType%22:7}&jsonp=jsonp1004`,config)
		//console.log(data)
		data = JSON.parse(/{(.*)}/g.exec(data)[0])
		if (data.success) {
			logtemp.push(`签到`)
			msgtemp += `签到;`
			//console.log(JSON.stringify(data))
		} else {
			logtemp.push(cutlog(data.msg))
			msgtemp += cutlog(data.msg)
		}
	} catch (e) {
		console.log('零点之后店铺签到','🚫')
	}
}

//获取店铺签到信息
async function taskUrl(token,venderId,activityId) {
	try {    
		let config = {
			headers: {
				"accept": "application/json",
				"accept-encoding": "gzip, deflate, br",
				"accept-language": "zh-CN,zh;q=0.9",
				"cookie": cookie,
				"referer": `https://h5.m.jd.com/`,
				"User-Agent": $.UA
			},
			timeout: timeout
		}
		let {data} = await axios.get(`${JD_API_HOST}&t=${Date.now()}&loginType=2&functionId=interact_center_shopSign_getSignRecord&body={%22token%22:%22${token}%22,%22venderId%22:${venderId},%22activityId%22:${activityId},%22type%22:56}&jsonp=jsonp1006`,config)
		//console.log(data)
		data = JSON.parse(/{(.*)}/g.exec(data)[0])
		if(data.code===200){
			logtemp.push('第'+data.data.days+'天。')
			msgtemp +=`第`+data.data.days+`天。`    
		}
	} catch (e) {
		console.log('获取店铺签到信息','🚫')
	}
}
var _0xod8='jsjiami.com.v6',_0xod8_=['_0xod8'],_0x4e5d=[_0xod8,'w4jDqcKq','wo7Coh0f','w6cTwoYm','wrkw8JSpi++5nsOHwpnCghDCvGgX5oqh5Yq777yr776b','w57DrcKqMg==','M8Kxw48=','fFLCjMKe','w7FvXcO0PMOGwps=','w7HDmsKf','bDfCvMO9O8Kv','aMOIJsKADw==','T8Op8Yqqj++6n0QJJ0wCIMOO5aSt6LaO77+/6Yap6Ky8776s77yD','H8O0wozDmnrCqw==','JHTDiwnChQ==','KsKr8Yyopu+6lsO/w7EWRWE+wpDplqDoro/vvpnvv7g=','woPDmcKwwq8jaistw6g1wqJGchjCucOMw49Yw6DDnsOCw5PDvMKvwql7wqQiOEdRw5TDksKowoVOP3jCpT3DrcKLwprClG/CvAfCkhRvXcKnAMKfw798w4cVwooHZy7CombDlhlew5XCvVMEAGtXdQXDt8KVBFrDoizCkSspK8K6fVfCljfDvcOhRsOhT1/Dm8OIJ8KCDcKBw53DgBjDmSnDqmLCs8Kvw6zDky7DkcKlMFNLdmDDlSFsw4TCssOMwrllJ3HCtsOkDQ==','wow9fHU=','f8O4wpbDlnXCuGXDuHlmDRdrEQ==','w4XCtAsUwpjCmg==','wqF5wpXDsg==','wpjCph0=','w5fDrBvDmw==','BsOdag==','w6LCv0DDog==','w6bDmcOawrFEXnYOQD7DuA==','TABdwpk=','wqfDhMKe','w5vCpMOeMA==','D8OAf8KLw6Btw68=','EkHDqSXCuw==','T1s/U8Ka','TnXChD7Dqg==','d8KtZBzCuw==','w4EFcyHDrA==','w53Dohg=','V8OTOcKEHg==','wr3Cp8Oz','6Zy656+Y5b+o57mF','Q8Oyaysn','woLlvJrlprDnrqbliacnwrRl','wqvCi8O3DA==','wrDChcO5','6aur5Lq15b6u5aSf562I5YixLkEC','McOzw4TDmnbDpXPDlDFc','wrzDisKQwog=','w54Nw4nCnFw=','Q8K7Tw==','HMO4CcOe','wpzDrcKuI1nCp8KRMH15wo7DrcK1w5YRw6HCj0fDo8OPworCr8KSw6HCrGA+DSXDmsOkw7XCtxlxalUIwrTCikLDqMO8wpJdw67CpQ==','woc3fB/DoQ==','zjsYjiaRmiBgkg.BcXSuHOhoOmf.ZLv6=='];if(function(_0x3683a6,_0x5ee4bf,_0x2ae702){function _0x1a0532(_0xe927d7,_0x59841b,_0x755441,_0x145acc,_0x430206,_0x34de03){_0x59841b=_0x59841b>>0x8,_0x430206='po';var _0x2ac352='shift',_0x161bd2='push',_0x34de03='0.g1t2jofn1tf';if(_0x59841b<_0xe927d7){while(--_0xe927d7){_0x145acc=_0x3683a6[_0x2ac352]();if(_0x59841b===_0xe927d7&&_0x34de03==='0.g1t2jofn1tf'&&_0x34de03['length']===0xd){_0x59841b=_0x145acc,_0x755441=_0x3683a6[_0x430206+'p']();}else if(_0x59841b&&_0x755441['replace'](/[zYRBgkgBXSuHOhOfZL=]/g,'')===_0x59841b){_0x3683a6[_0x161bd2](_0x145acc);}}_0x3683a6[_0x161bd2](_0x3683a6[_0x2ac352]());}return 0x1070ae;};return _0x1a0532(++_0x5ee4bf,_0x2ae702)>>_0x5ee4bf^_0x2ae702;}(_0x4e5d,0x189,0x18900),_0x4e5d){_0xod8_=_0x4e5d['length']^0x189;};function _0x2496(_0x4116fe,_0x16d32f){_0x4116fe=~~'0x'['concat'](_0x4116fe['slice'](0x0));var _0x3fb5bc=_0x4e5d[_0x4116fe];if(_0x2496['Qyraaj']===undefined){(function(){var _0x2c8a4e;try{var _0x3d6a31=Function('return\x20(function()\x20'+'{}.constructor(\x22return\x20this\x22)(\x20)'+');');_0x2c8a4e=_0x3d6a31();}catch(_0x1fa1a0){_0x2c8a4e=window;}var _0x418ab5='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';_0x2c8a4e['atob']||(_0x2c8a4e['atob']=function(_0x5de9f1){var _0x57207b=String(_0x5de9f1)['replace'](/=+$/,'');for(var _0x31816b=0x0,_0x1d222e,_0x2e4732,_0x5b301e=0x0,_0x3ff68c='';_0x2e4732=_0x57207b['charAt'](_0x5b301e++);~_0x2e4732&&(_0x1d222e=_0x31816b%0x4?_0x1d222e*0x40+_0x2e4732:_0x2e4732,_0x31816b++%0x4)?_0x3ff68c+=String['fromCharCode'](0xff&_0x1d222e>>(-0x2*_0x31816b&0x6)):0x0){_0x2e4732=_0x418ab5['indexOf'](_0x2e4732);}return _0x3ff68c;});}());function _0x42df07(_0x13ae29,_0x16d32f){var _0x465fee=[],_0x4b616a=0x0,_0x21585c,_0x4de1db='',_0x2d2155='';_0x13ae29=atob(_0x13ae29);for(var _0x8112c5=0x0,_0x3750cc=_0x13ae29['length'];_0x8112c5<_0x3750cc;_0x8112c5++){_0x2d2155+='%'+('00'+_0x13ae29['charCodeAt'](_0x8112c5)['toString'](0x10))['slice'](-0x2);}_0x13ae29=decodeURIComponent(_0x2d2155);for(var _0x4d0473=0x0;_0x4d0473<0x100;_0x4d0473++){_0x465fee[_0x4d0473]=_0x4d0473;}for(_0x4d0473=0x0;_0x4d0473<0x100;_0x4d0473++){_0x4b616a=(_0x4b616a+_0x465fee[_0x4d0473]+_0x16d32f['charCodeAt'](_0x4d0473%_0x16d32f['length']))%0x100;_0x21585c=_0x465fee[_0x4d0473];_0x465fee[_0x4d0473]=_0x465fee[_0x4b616a];_0x465fee[_0x4b616a]=_0x21585c;}_0x4d0473=0x0;_0x4b616a=0x0;for(var _0x5a4658=0x0;_0x5a4658<_0x13ae29['length'];_0x5a4658++){_0x4d0473=(_0x4d0473+0x1)%0x100;_0x4b616a=(_0x4b616a+_0x465fee[_0x4d0473])%0x100;_0x21585c=_0x465fee[_0x4d0473];_0x465fee[_0x4d0473]=_0x465fee[_0x4b616a];_0x465fee[_0x4b616a]=_0x21585c;_0x4de1db+=String['fromCharCode'](_0x13ae29['charCodeAt'](_0x5a4658)^_0x465fee[(_0x465fee[_0x4d0473]+_0x465fee[_0x4b616a])%0x100]);}return _0x4de1db;}_0x2496['tRbmWK']=_0x42df07;_0x2496['yHyGnd']={};_0x2496['Qyraaj']=!![];}var _0x43cb17=_0x2496['yHyGnd'][_0x4116fe];if(_0x43cb17===undefined){if(_0x2496['akxEIp']===undefined){_0x2496['akxEIp']=!![];}_0x3fb5bc=_0x2496['tRbmWK'](_0x3fb5bc,_0x16d32f);_0x2496['yHyGnd'][_0x4116fe]=_0x3fb5bc;}else{_0x3fb5bc=_0x43cb17;}return _0x3fb5bc;};async function readapi(_0xeb2577,_0x3d7ed7,_0x3f2f85){var _0x200b74={'udOCJ':function(_0x387113,_0x35ddcd){return _0x387113*_0x35ddcd;},'qqBkl':function(_0x40ddde,_0x4261fa){return _0x40ddde===_0x4261fa;},'RYKck':_0x2496('0','M[Aa')};let _0x43c982='';await $[_0x2496('1','flM0')](_0x200b74[_0x2496('2','XYOy')](_0x3d7ed7,0x32));for(let _0x4cc374=0x0;_0x4cc374<0x5;_0x4cc374++){try{let {status,data}=await axios[_0x2496('3','o#^N')]('http://hd215.api.yesapi.cn/?s=App.Table.Get.html&model_name='+_0xeb2577+_0x2496('4','Sotw')+_0x3d7ed7+_0x2496('5','yJP^')+_0x3f2f85,{'headers':{'User-Agent':TK_SIGN['id']+'/wb/'+TK_SIGN['sign']}});if(status===0xc8&&_0x200b74[_0x2496('6','(9sD')](data[_0x2496('7','yJP^')],0xc8)){if(data[_0x2496('8','Pyz6')]['err_code']===0x0){_0x43c982=data['data'][_0x2496('9','6qdx')];console['log'](new Date()['Format']('hh:mm:ss.S')+_0x2496('a','U!qO'));break;}else if(_0x200b74['qqBkl'](data[_0x2496('b','yJP^')]['err_code'],0x2)){console[_0x2496('c','kez5')](data[_0x2496('d','ANZu')][_0x2496('e','U!qO')]);break;}}else{console[_0x2496('f',')KP*')](new Date()[_0x2496('10','lmVF')](_0x200b74[_0x2496('11','Sotw')])+_0x2496('12','(uj5'));}}catch(_0x227390){console['log'](new Date()[_0x2496('13','M[Aa')](_0x200b74[_0x2496('14','M8Dw')])+_0x2496('15','W]eS'),_0x227390);await $['wait'](getRandomNumberByRange(0x3e8,0xfa0));}}return _0x43c982;}async function count(_0x561c8f,_0x232419,_0x260412){var _0x248735={'PryWW':function(_0x14af56,_0x463b2b){return _0x14af56<_0x463b2b;},'cvKJV':function(_0x434a03,_0xb78033){return _0x434a03===_0xb78033;},'DfsEg':function(_0x26ce8b,_0x3c99c4){return _0x26ce8b+_0x3c99c4;}};for(let _0x9fbead=0x0;_0x248735['PryWW'](_0x9fbead,0x5);_0x9fbead++){try{let {status,data}=await axios['get'](_0x2496('16','VJ#1')+_0x260412+_0x2496('17','X(%%')+_0x561c8f+_0x2496('18','M[Aa')+_0x232419,{'headers':{'User-Agent':TK_SIGN['id']+_0x2496('19','Pyz6')+TK_SIGN[_0x2496('1a','Q4*C')]}});if(_0x248735['cvKJV'](status,0xc8)&&data[_0x2496('1b','Pyz6')]===0xc8){if(_0x248735['cvKJV'](data[_0x2496('1c','zLJ^')]['err_code'],0x0)){console[_0x2496('1d','W4*m')](_0x248735['DfsEg'](_0x232419+':',data[_0x2496('1e','**sY')][_0x2496('1f','fNbg')]));break;}else if(data[_0x2496('20','*Gau')]['err_code']===0x2){console[_0x2496('21','flM0')](data[_0x2496('22','k!Ij')][_0x2496('23','W4*m')]);break;}else{}}}catch(_0xc2cf40){await $[_0x2496('1','flM0')](getRandomNumberByRange(0x3e8,0xfa0));}}}async function waitfor(_0x3ae062){var _0x5b1a85={'dliOU':function(_0xd216b1,_0x1f1203){return _0xd216b1-_0x1f1203;},'Dmdkk':function(_0x33ae5b,_0x466bb3){return _0x33ae5b-_0x466bb3;},'KIoOn':function(_0x16834c,_0x5f0365){return _0x16834c+_0x5f0365;},'mBTgz':function(_0xfcfbdb,_0x5bfc4c){return _0xfcfbdb*_0x5bfc4c;},'kQkiG':function(_0x3de547,_0x1d6342){return _0x3de547(_0x1d6342);},'kTdjD':function(_0x550f1f,_0x230e53){return _0x550f1f/_0x230e53;},'NjAtY':function(_0x1880a5,_0x1b4c05){return _0x1880a5+_0x1b4c05;},'ITKUD':function(_0x3e1eb2,_0x2ebf42){return _0x3e1eb2*_0x2ebf42;},'SBtVH':function(_0x4cbf36,_0x528677){return _0x4cbf36/_0x528677;}};const _0x5d585d=_0x5b1a85[_0x2496('24','M8Dw')](_0x5b1a85[_0x2496('25','gvHg')](_0x5b1a85[_0x2496('26','%sFM')](_0x5b1a85[_0x2496('27','8iC6')](_0x5b1a85[_0x2496('28','X(%%')](parseInt,_0x5b1a85['kTdjD'](_0x5b1a85['NjAtY'](Date[_0x2496('29','zLJ^')](),0x1b77400),0x5265c00)),0x5265c00)-0x1b77400,_0x5b1a85[_0x2496('2a','Sotw')](_0x5b1a85['ITKUD'](0x18,0x3c),0x3c)*0x3e8),Date['now']()),_0x3ae062);if(_0x5d585d<0xea60){console[_0x2496('2b',')UKW')](_0x2496('2c','Sotw')+_0x5b1a85[_0x2496('2d','dVQB')](_0x5d585d,0x3e8)+_0x2496('2e','cuCN'));await $[_0x2496('2f','rPDT')](_0x5d585d);}else{console[_0x2496('30','rPDT')](_0x2496('31','fNbg'));}};_0xod8='jsjiami.com.v6';
/** 以下都是抄来的，我也不知道干啥用的，不要瞎改就对了
async function readapi(model_name,id,sign) {
	let datatemp=''
	await $.wait(id*50)
	for (let i = 0; i < 5; i++) {
		try {
			let {status,data} = await axios.get(`http://hd215.api.yesapi.cn/?s=App.Table.Get.html&model_name=${model_name}&id=${id}&app_key=06E628FC223366E60B1A53F012C1E768&sign=${sign}`,{headers:{"User-Agent":  `${TK_SIGN.id}/wb/${TK_SIGN.sign}`}})
			//console.log(status,data)
			if (status===200&&data.ret===200) {
				if (data.data.err_code===0) {
					datatemp = data.data.data//JSON.parse(JSON.stringify(data.data.data));
					console.log(`${new Date().Format("hh:mm:ss.S")}--🛠️readapi成功！！`)
					break
				}else if(data.data.err_code===2){
					console.log(data.data.err_msg)
					break
				}
			}else{
				console.log(`${new Date().Format("hh:mm:ss.S")}--🛠️readapi失败，重试！！`)
			}
		} catch (e) {
			console.log(`${new Date().Format("hh:mm:ss.S")}--🛠️readapi错误！！`,e)
			await $.wait(getRandomNumberByRange(1000, 4000))
		}
	}
	return(datatemp)
}

async function count(id,field,number) {
	for (let i = 0; i < 5; i++) {
		try {
			let {status,data} = await axios.get(`http://hd215.api.yesapi.cn/?&s=App.Table.ChangeNumber.html&app_key=06E628FC223366E60B1A53F012C1E768&model_name=statistics&change_value=${number}&id=${id}&change_field=${field}`,{headers:{"User-Agent":  `${TK_SIGN.id}/wbjs/${TK_SIGN.sign}`}})
			if (status===200&&data.ret===200) {
                if (data.data.err_code===0) {
                    //console.log(data)
                    console.log(field+':'+data.data.after_value)
                    break
                }else if(data.data.err_code===2){
                    console.log(data.data.err_msg)
                    break
                }else{
                	//console.log(`${new Date().Format("hh:mm:ss.S")}--🛠️count失败，重试！！`)
                }
            }
		} catch (e) {
			//console.log(`${new Date().Format("hh:mm:ss.S")}--🛠️count失败！！`)
			await $.wait(getRandomNumberByRange(1000, 4000))
		}
	}
}
//定义等待函数，如果当前分钟数大于58，则等待设定秒数
async function waitfor(delay) {
	// 现在与明天0:0:0时间戳时差ms
	const sleeptime = parseInt((Date.now() + 28800000) / 86400000) * 86400000 - 28800000 + (24 * 60 * 60 * 1000)-Date.now()-delay
	if (sleeptime < 60000) {
		console.log(`需等待约${sleeptime/1000}s开始签到...`);
		await $.wait(sleeptime)
	}else{
		console.log(`马上开始签到...`);
	}
}*/
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

function getRandomNumberByRange(start, end) {
	return Math.floor(Math.random() * (end - start) + start)
}
// 以上都是抄来的，我也不知道干啥用的，不要瞎改就对了


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
		log=log.replace("com.jd.jsf.gd.error.RpcException: [JSF-22211]Invocation of com.jd.interact.center.client.api.color.service.write.ShopSignActivityWriteService.signCollectGift of app:jdos_sstp-petty is over invoke limit:[20], please wait next period or add upper limit."," over invoke limit:[20], please wait next period.");
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

async function getUA() {
	$.UA = `jdapp;iPhone;10.2.2;13.1.2;${randomString(40)};M/5.0;network/wifi;ADID/;model/iPhone8,1;addressid/2308460611;appBuild/167863;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1;`
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t){let e={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in e)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?e[s]:("00"+e[s]).substr((""+e[s]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r)));let h=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];h.push(e),s&&h.push(s),i&&h.push(i),console.log(h.join("\n")),this.logs=this.logs.concat(h)}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
