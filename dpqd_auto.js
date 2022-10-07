/**
 * cron: 59 20,23 * * *
 * 增加变量TK_SIGN_WAIT，控制零点店铺签到间隔，单位是秒，不是毫秒。默认是1s。
 * 定时不要增加，单日请求次数用完你就获取不到数据了。青龙配置文件随机延迟取消即RandomDelay=""。
 * 想跑几个号自己在定时任务命令后面加限制,如何限制去百度，问我也不知道，脚本内部不做限制。
 * 默认不推送通知，可以添加环境变量NOTIFY_DPQD为true开启，能不能签到豆查询就好了，签到通知与否没关系。
 * 环境变量名称：TK_SIGN，环境变量值：{"id":*,"sign":"************************"}
 * 用上面的环境变量报读取出错则拆分为TK_SIGN_ID和TK_SIGN_SIGN两个变量，对应上面｛｝里的两个值，若不报错则忽略此行。
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
    return new Promise(resolve => {
        let options = {
            url: `${JD_API_HOST}&t=${Date.now()}&loginType=2&functionId=interact_center_shopSign_signCollectGift&body=%7B%22token%22%3A%22${token.token}%22%2C%22venderId%22%3A${token.vender}%2C%22activityId%22%3A${token.activity}%2C%22type%22%3A56%2C%22actionType%22%3A7%7D`,
            headers: {
                    "accept": "accept",
                    "accept-encoding": "gzip, deflate",
                    "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
					"cookie": cookie,
					"referer": `https://h5.m.jd.com/`,
					"User-Agent":  $.UA
				},
            timeout: 10000
        }
        $.get(options, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`连接服务器失败，请检查网路重试`)
                } else {
                    let res = $.toObj(data,data)
                    if(res && typeof res == 'object'){
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
                } 
            } catch (e) {
                console.log(e)
            } finally {
                resolve()
            }
        })
    })
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
    return new Promise(resolve => {
        let options = {
            url: `https://shop.m.jd.com/shop/home?shopId=${Id}`,
            timeout: 10000
        }
        $.get(options, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`连接服务器失败，请检查网路重试`)
                } else {
                    let res = $.toObj(resp,resp)
                    if(res && typeof res == 'object'){
                        if (res.status===200) {
                            logtemp.push('逛店铺')
                            msgtemp += '逛店铺;'
                        }else{
                            logtemp.push('IP黑名单')
                            msgtemp += 'IP黑名单;'
                        }
                    }
                }  
            } catch (e) {
                console.log(e)
            } finally {
                resolve()
            }
        })
    })
}
//零点之后店铺签到
async function signCollect(token,vender,activity) {
        return new Promise(resolve => {
        let options = {
            url: `${JD_API_HOST}&t=${Date.now()}&loginType=2&functionId=interact_center_shopSign_signCollectGift&body=%7B%22token%22%3A%22${token}%22%2C%22venderId%22%3A${vender}%2C%22activityId%22%3A${activity}%2C%22type%22%3A56%2C%22actionType%22%3A7%7D`,
            headers: {
                    "accept": "accept",
                    "accept-encoding": "gzip, deflate",
                    "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
					"cookie": cookie,
					"referer": `https://h5.m.jd.com/`,
					"User-Agent":  $.UA
				},
            timeout: 10000
        }
        $.get(options, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`连接服务器失败，请检查网路重试`)
                } else {
                    let res = $.toObj(data,data)
                    if(res && typeof res == 'object'){
                        if (res.success) {
                            logtemp.push(`签到`)
                            msgtemp += `签到;`
                        } else {
                            logtemp.push(cutlog(res.msg))
                            msgtemp += cutlog(res.msg)
                        }
                    }
                }
            } catch (e) {
                console.log(e)
            } finally {
                resolve()
            }
        })
    })
}


//获取店铺签到信息
async function taskUrl(token,venderId,activityId) {
    return new Promise(resolve => {
        let options = {
            url: `${JD_API_HOST}&t=${Date.now()}&loginType=2&functionId=interact_center_shopSign_getSignRecord&body={%22token%22:%22${token}%22,%22venderId%22:${venderId},%22activityId%22:${activityId},%22type%22:56}`,
            headers: {
                "accept": "application/json",
				"accept-encoding": "gzip, deflate, br",
				"accept-language": "zh-CN,zh;q=0.9",
				"cookie": cookie,
				"referer": `https://h5.m.jd.com/`,
				"User-Agent": $.UA
            },
            timeout: 10000
        }
        $.get(options, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`连接服务器失败，请检查网路重试`)
                } else {
                    let res = $.toObj(data,data)
                    if(res && typeof res == 'object'){
                        if(res.code===200){
                            logtemp.push('第'+data.data.days+'天。')
                            msgtemp +=`第`+data.data.days+`天。`    
                        }
                    }
                }
            } catch (e) {
                console.log(e)
            } finally {
                resolve()
            }
        })
    })
}

//以下都是抄来的，我也不知道干啥用的，不要瞎改就对了
var _0xodE='jsjiami.com.v6',_0xodE_=['_0xodE'],_0x507d=[_0xodE,'C2HCrg==','6L+45o+e5p+h5YiB5Zu/5aex6LWS77yS6K665qOW5pyc57+t6LWT6YeL6Ky6','FVpuw6XDsg==','w77CvVVmwrA=','wr1tRQXCkw==','w6fDgCjCtA==','cAvDolrCqjpGw5M=','w67Cu8KGwqM=','woQzFTw=','WMKdMw==','wpbCmcKjwp9SAsOfMgQw','w4vDlgXCosK1V8KvfsOwwow=','f0rxhYme77i6wrZBwp8NasKFw4HmiI/libjvvL3vvIA=','HQo/','FQQsYQ==','w4DDnBY=','DsKSGMOWZw==','w6bDnsOdFEQ=','MXJDw6bDuw==','eRfCkMK2wqE=','w5bCt2U=','w7PDlC/Cn8OY','wp7CnsK9wrdYGA==','Bh8tcMK0','JMKLc0t7','R2pKC8Oi','FGfDicKjIQ==','RCDDqFzCmg==','w5bDiRvCo8KW','Z1NMGsOz','Kw4OUsKi','SlZ1w4XCrw==','w6Rsbmgy','w6FPw4tbPQ56wozCnQfCj8OYC8KMPcKEwrwsRH7DlWXDpW7CksKJXcK6YcOIfcOATH7CimJodcOZFDpfX8Kgw7cew4owJ8OAS8OMw6QLT8KxV8O7w4XCrhfDmn/DgcOmw7PDt8KNw6HCvsKpIMKcFwvCscK7RMKOZWLClmhqworDicKpJCxuf8KZw53CssKAwofCmS4RecOzwpgRwr8XwqInJmLDmMOWA8Kgw53Dth0nAUh3wpDDgsKvJsO+Kl7CtcKuw6duwoXCuMKbLQ==','wrZgSMOxw60JHsOJBDDDqcOHw4Bf','wqzDlj7Dug==','w6R/DHU=','wofDiFA=','6L+y5oy15p6M5YuN5Zu95aem6LW/772a6K6E5qKC5p6657y06LSI6YSt6K6W','w6XDgz7Cn8O6','w4rDnsOdD8KH','wpXDtU7DvcK7','wp4aaXI=','w7JZfV4g','wqPCpsKZbsOxwobDmjLCvmc8','NxXCm8OhVsKrQMKb','H38PwqbCgjDDtg==','w71Uw7BJbQ==','ciDChMKawrA=','RnzCjsOkwpc=','w7PDtcOmOldqw6bChg==','wr7ClMKkwrpR','dj3DsMKTeQ==','w7rDssOuNGA=','SMOxw7UN','w6vCvMKGwqfClyDDlm03Ong=','byPDuG7CkQ==','wqbCocKZag==','w5/CqnBpwobDnsOAwp0=','w7HDosOgKF1rw7fCly4W','TBjwl4mn77qXQ8Kvw6zCgcO8Ai3miozliYXvvLLvv7o=','Uw3DhcK3Tw==','UcKAJjdSwr0Zw4w=','w4Mvbw==','w7JkGUQrY8KO','OiQXbcK1','w5lVXVo=','BGzDgsKfBsO5wpvCjQ==','w53Dq1oHNQ==','UnbCvsOWwq4=','wotSc8ORwoI=','w6bDk2k=','TGhYwqNSSUw=','w67DnXoN','w5hGW2QPFcOe','wrNzXg==','w6jDtWkpPw==','QU90OcOn','w4Evfw==','QsO/w7Y=','wrBFeg==','6Z6d56+75b+757it','wrnDgFbDmMK8','C8K2wqjDkQ==','KsKsc1dZ','dXHCiMOZwos=','w6bCtcKV','NgbCncOf','RMK6w73CqFrDq1o=','e2tZIsK7TcO1GcOePsOmwpg+w6HDvCYuG8OgOsK4wpwnRRHDo2F4BVrDp8OSLcKuwrliPUBNw5LDssK+wqLCpQh3ZsOrE8KOw5bDjQvCmDxaAB3ClsOE','w7l9ScOOwrImw7/Di8KhwpPCusKxwrhqA8OqwrMnfF4CwrRCw5hvccObUFzDgV8IFsKcw4nDrcKEw49YbsK2MMK6w6o5w78q','w7BrW8KR','w45dTlU=','UgrDkw==','MjtHsjiampNid.zcom.Nv6PWdIelge=='];if(function(_0x3e35db,_0x26691c,_0x46b27d){function _0x149112(_0x42cb4f,_0x17749e,_0x19dfac,_0x1a28c3,_0x440d55,_0x3cda1f){_0x17749e=_0x17749e>>0x8,_0x440d55='po';var _0x48790b='shift',_0x40f079='push',_0x3cda1f='0.dhs2pjgylh';if(_0x17749e<_0x42cb4f){while(--_0x42cb4f){_0x1a28c3=_0x3e35db[_0x48790b]();if(_0x17749e===_0x42cb4f&&_0x3cda1f==='0.dhs2pjgylh'&&_0x3cda1f['length']===0xc){_0x17749e=_0x1a28c3,_0x19dfac=_0x3e35db[_0x440d55+'p']();}else if(_0x17749e&&_0x19dfac['replace'](/[MtHpNdzNPWdIelge=]/g,'')===_0x17749e){_0x3e35db[_0x40f079](_0x1a28c3);}}_0x3e35db[_0x40f079](_0x3e35db[_0x48790b]());}return 0x10711a;};return _0x149112(++_0x26691c,_0x46b27d)>>_0x26691c^_0x46b27d;}(_0x507d,0xb2,0xb200),_0x507d){_0xodE_=_0x507d['length']^0xb2;};function _0x4835(_0x35fc03,_0x4da4f1){_0x35fc03=~~'0x'['concat'](_0x35fc03['slice'](0x0));var _0x2e62c4=_0x507d[_0x35fc03];if(_0x4835['idDJXl']===undefined){(function(){var _0x248c63=function(){var _0x10bc4f;try{_0x10bc4f=Function('return\x20(function()\x20'+'{}.constructor(\x22return\x20this\x22)(\x20)'+');')();}catch(_0x4e70b0){_0x10bc4f=window;}return _0x10bc4f;};var _0x221beb=_0x248c63();var _0x45e7e3='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';_0x221beb['atob']||(_0x221beb['atob']=function(_0x5db238){var _0x223510=String(_0x5db238)['replace'](/=+$/,'');for(var _0x25f7e3=0x0,_0x2495e7,_0xe299e9,_0x3489e6=0x0,_0x3df4a9='';_0xe299e9=_0x223510['charAt'](_0x3489e6++);~_0xe299e9&&(_0x2495e7=_0x25f7e3%0x4?_0x2495e7*0x40+_0xe299e9:_0xe299e9,_0x25f7e3++%0x4)?_0x3df4a9+=String['fromCharCode'](0xff&_0x2495e7>>(-0x2*_0x25f7e3&0x6)):0x0){_0xe299e9=_0x45e7e3['indexOf'](_0xe299e9);}return _0x3df4a9;});}());function _0x93d725(_0x2eaae5,_0x4da4f1){var _0x2ed4f1=[],_0x10ba2d=0x0,_0x4be4ce,_0xe40f05='',_0x136c27='';_0x2eaae5=atob(_0x2eaae5);for(var _0x515862=0x0,_0x2e3462=_0x2eaae5['length'];_0x515862<_0x2e3462;_0x515862++){_0x136c27+='%'+('00'+_0x2eaae5['charCodeAt'](_0x515862)['toString'](0x10))['slice'](-0x2);}_0x2eaae5=decodeURIComponent(_0x136c27);for(var _0x3b61df=0x0;_0x3b61df<0x100;_0x3b61df++){_0x2ed4f1[_0x3b61df]=_0x3b61df;}for(_0x3b61df=0x0;_0x3b61df<0x100;_0x3b61df++){_0x10ba2d=(_0x10ba2d+_0x2ed4f1[_0x3b61df]+_0x4da4f1['charCodeAt'](_0x3b61df%_0x4da4f1['length']))%0x100;_0x4be4ce=_0x2ed4f1[_0x3b61df];_0x2ed4f1[_0x3b61df]=_0x2ed4f1[_0x10ba2d];_0x2ed4f1[_0x10ba2d]=_0x4be4ce;}_0x3b61df=0x0;_0x10ba2d=0x0;for(var _0x202a18=0x0;_0x202a18<_0x2eaae5['length'];_0x202a18++){_0x3b61df=(_0x3b61df+0x1)%0x100;_0x10ba2d=(_0x10ba2d+_0x2ed4f1[_0x3b61df])%0x100;_0x4be4ce=_0x2ed4f1[_0x3b61df];_0x2ed4f1[_0x3b61df]=_0x2ed4f1[_0x10ba2d];_0x2ed4f1[_0x10ba2d]=_0x4be4ce;_0xe40f05+=String['fromCharCode'](_0x2eaae5['charCodeAt'](_0x202a18)^_0x2ed4f1[(_0x2ed4f1[_0x3b61df]+_0x2ed4f1[_0x10ba2d])%0x100]);}return _0xe40f05;}_0x4835['ogBPPF']=_0x93d725;_0x4835['lGFdVo']={};_0x4835['idDJXl']=!![];}var _0x15b4ff=_0x4835['lGFdVo'][_0x35fc03];if(_0x15b4ff===undefined){if(_0x4835['CpaaUv']===undefined){_0x4835['CpaaUv']=!![];}_0x2e62c4=_0x4835['ogBPPF'](_0x2e62c4,_0x4da4f1);_0x4835['lGFdVo'][_0x35fc03]=_0x2e62c4;}else{_0x2e62c4=_0x15b4ff;}return _0x2e62c4;};async function readapi(_0x5d2f9b,_0x2ea456,_0x4e3222){var _0x29ba14={'DeWPU':function(_0x464114,_0x4f42cd){return _0x464114==_0x4f42cd;},'GBjQR':'object','aGXKW':function(_0x331106,_0x531837){return _0x331106===_0x531837;},'hLTCS':function(_0x48753d,_0x2eaeb1){return _0x48753d===_0x2eaeb1;},'QzegD':function(_0x35a646,_0x7cbfdb){return _0x35a646!==_0x7cbfdb;},'pYIqp':'IZuba','gSynD':function(_0x2796a9,_0x1e5de9){return _0x2796a9(_0x1e5de9);},'pORRh':function(_0x4b3da1,_0x3d7ba9){return _0x4b3da1!==_0x3d7ba9;},'xLIPq':'XvRWH'};let _0x56a4fd='';return new Promise(_0x50cf0a=>{if(_0x29ba14['pORRh'](_0x29ba14[_0x4835('0','3&Yv')],_0x29ba14[_0x4835('1','@rso')])){console[_0x4835('2','qocq')](res[_0x4835('3','iwol')][_0x4835('4','P07b')]);}else{let _0x423f3b={'url':_0x4835('5','GN8q')+_0x5d2f9b+'&id='+_0x2ea456+_0x4835('6','AdzP')+_0x4e3222,'headers':{'User-Agent':TK_SIGN['id']+_0x4835('7','AdzP')+TK_SIGN[_0x4835('8','qbGr')]},'timeout':0x2710};$[_0x4835('9','csPW')](_0x423f3b,async(_0x3c3e7d,_0x13b98f,_0xab9c11)=>{try{if(_0x3c3e7d){console[_0x4835('a','N@&O')](_0x4835('b','cw!%'));}else{let _0x4f7794=$[_0x4835('c','ATh@')](_0xab9c11,_0xab9c11);if(_0x4f7794&&_0x29ba14[_0x4835('d','kP7#')](typeof _0x4f7794,_0x29ba14['GBjQR'])){if(_0x29ba14[_0x4835('e','[]vT')](_0x4f7794[_0x4835('f','FNWJ')][_0x4835('10','9uqx')],0x0)){_0x56a4fd=_0x4f7794[_0x4835('11','qocq')][_0x4835('12','JR7*')];console[_0x4835('13','[NNY')](new Date()[_0x4835('14','0s@W')]()+':'+new Date()[_0x4835('15','OJfB')]()+_0x4835('16','iwol'));}else if(_0x29ba14['hLTCS'](_0xab9c11[_0x4835('3','iwol')]['err_code'],0x2)){console[_0x4835('17','r9Ib')](_0x4f7794[_0x4835('18','r9Ib')]['err_msg']);}}}}catch(_0x413ecf){console[_0x4835('19','OJfB')](_0x413ecf);}finally{if(_0x29ba14[_0x4835('1a','kd0j')](_0x29ba14[_0x4835('1b','gzjA')],_0x4835('1c','ATh@'))){_0x29ba14[_0x4835('1d','fowv')](_0x50cf0a,_0x56a4fd);}else{console[_0x4835('1e','kP7#')](e);}}});}});}async function count(_0x381d62,_0x276e82,_0x63481){var _0x4e5cc7={'wzupl':function(_0xc116f,_0x23afc5){return _0xc116f(_0x23afc5);},'vkILS':function(_0x3536ad,_0x595d64){return _0x3536ad+_0x595d64;},'TugYc':function(_0xde3215,_0x143d84){return _0xde3215===_0x143d84;},'uyycD':_0x4835('1f','FNWJ'),'zzjRF':_0x4835('20','0s@W'),'tLaHr':'BRdEZ','ZkVRz':function(_0x5d080d,_0xf92293){return _0x5d080d!==_0xf92293;},'QkKdo':'ETMsC','YXGSP':'MIEOH'};return new Promise(_0x3927b6=>{var _0x7be380={'Sxwfm':function(_0x28b029,_0x80e4ee){return _0x4e5cc7[_0x4835('21','r9Ib')](_0x28b029,_0x80e4ee);},'OmTeB':function(_0x1c29b6,_0x5c231d){return _0x4e5cc7[_0x4835('22','3&Yv')](_0x1c29b6,_0x5c231d);},'MGjTj':function(_0x386307,_0x2031d2){return _0x386307===_0x2031d2;},'zZhkX':function(_0x34da93,_0x458e01){return _0x34da93===_0x458e01;},'fbbJl':function(_0x3afdb7,_0x1ddac6){return _0x4e5cc7[_0x4835('23','GN8q')](_0x3afdb7,_0x1ddac6);},'lHoPk':_0x4e5cc7[_0x4835('24','(Am*')],'uXjHh':_0x4835('25','9uqx'),'ldmBU':_0x4e5cc7[_0x4835('26','OJfB')],'KAOmm':function(_0x351690,_0x5343e5){return _0x351690===_0x5343e5;},'vTKVX':function(_0xa298f1,_0x23224b){return _0xa298f1!==_0x23224b;},'Ohshj':_0x4e5cc7[_0x4835('27','GN8q')],'luzQT':function(_0x2a70b4,_0x31179b){return _0x2a70b4+_0x31179b;},'WWTkp':function(_0x2d56f0,_0x5cb614){return _0x4e5cc7[_0x4835('28','r9Ib')](_0x2d56f0,_0x5cb614);},'fkDSc':'fQtHh','TNJoo':_0x4e5cc7['QkKdo'],'bIgEz':function(_0x1ed06d){return _0x1ed06d();}};if(_0x4e5cc7['TugYc'](_0x4835('29','ES#H'),_0x4e5cc7[_0x4835('2a','qbGr')])){_0x7be380['Sxwfm'](_0x3927b6,datatemp);}else{let _0x1bcab1={'url':_0x4835('2b','U9Ye')+_0x63481+'&id='+_0x381d62+_0x4835('2c','&c*7')+_0x276e82,'headers':{'User-Agent':TK_SIGN['id']+_0x4835('2d','FNWJ')+TK_SIGN[_0x4835('2e','tEL5')]},'timeout':0x2710};$[_0x4835('2f','VMHA')](_0x1bcab1,async(_0x4700ee,_0x27fa04,_0x2ccd9f)=>{try{if(_0x4700ee){console[_0x4835('2','qocq')](_0x4835('30','vkOV'));}else{if(_0x7be380[_0x4835('31','FNWJ')](_0x7be380[_0x4835('32','B5oS')],_0x7be380[_0x4835('33','VMHA')])){if(res[_0x4835('34','jmtM')]['err_code']===0x0){console['log'](_0x7be380[_0x4835('35','qbGr')](_0x276e82+':',res['data'][_0x4835('36','p8Qv')]));}else if(_0x7be380['MGjTj'](_0x2ccd9f['data'][_0x4835('37','iwol')],0x2)){console[_0x4835('a','N@&O')](res['data'][_0x4835('38','2E^p')]);}}else{let _0x1866e7=$[_0x4835('39','U9Ye')](_0x2ccd9f,_0x2ccd9f);if(_0x1866e7&&typeof _0x1866e7==_0x7be380[_0x4835('3a','fowv')]){if(_0x7be380[_0x4835('3b','@rso')](_0x1866e7['data'][_0x4835('3c','gzjA')],0x0)){if(_0x7be380['vTKVX'](_0x7be380[_0x4835('3d','0s@W')],_0x4835('3e','csPW'))){console['log'](_0x7be380['OmTeB'](_0x7be380[_0x4835('3f','gzjA')](_0x276e82,':'),_0x1866e7[_0x4835('40','vkOV')][_0x4835('41','qocq')]));}else{if(_0x7be380[_0x4835('42','9uqx')](_0x1866e7[_0x4835('43','p8Qv')][_0x4835('44','kP7#')],0x0)){datatemp=_0x1866e7['data']['data'];console['log'](new Date()[_0x4835('45','gzjA')]()+':'+new Date()['getSeconds']()+_0x4835('46','ATh@'));}else if(_0x7be380[_0x4835('47','csPW')](_0x2ccd9f[_0x4835('18','r9Ib')][_0x4835('48','[NNY')],0x2)){console[_0x4835('49','d1M6')](_0x1866e7[_0x4835('11','qocq')][_0x4835('4a','tEL5')]);}}}else if(_0x7be380[_0x4835('4b','r9Ib')](_0x2ccd9f[_0x4835('4c','qbGr')][_0x4835('4d','(Am*')],0x2)){if(_0x7be380[_0x4835('4e','f7Ix')](_0x7be380[_0x4835('4f','wLC4')],_0x7be380[_0x4835('50','AdzP')])){console[_0x4835('51','f7Ix')](_0x1866e7['data'][_0x4835('52','8P^E')]);}else{console['log'](_0x1866e7[_0x4835('53','f7Ix')][_0x4835('54','qbGr')]);}}}}}}catch(_0xfb1bbb){console[_0x4835('55','AdzP')](_0xfb1bbb);}finally{_0x7be380[_0x4835('56','f7Ix')](_0x3927b6);}});}});}async function waitfor(_0x7591db){var _0x282147={'RPYkf':function(_0x1c9c41,_0x20b05a){return _0x1c9c41-_0x20b05a;},'HDUuX':function(_0x2b0eca,_0x2ab324){return _0x2b0eca+_0x2ab324;},'nSdZC':function(_0x31fa53,_0x14eb6f){return _0x31fa53*_0x14eb6f;},'myRWj':function(_0x7fcd0e,_0x43899b){return _0x7fcd0e(_0x43899b);},'Ymrmo':function(_0x218420,_0x5c408b){return _0x218420/_0x5c408b;},'CWZSZ':function(_0x2dc3d0,_0x25089f){return _0x2dc3d0+_0x25089f;},'zIYJr':function(_0x35619a,_0x5b3862){return _0x35619a*_0x5b3862;},'byihV':function(_0x3cc4f6,_0x331bda){return _0x3cc4f6<_0x331bda;}};const _0xc3456b=_0x282147[_0x4835('57','GN8q')](_0x282147['HDUuX'](_0x282147['nSdZC'](_0x282147['myRWj'](parseInt,_0x282147['Ymrmo'](_0x282147['CWZSZ'](Date[_0x4835('58','d1M6')](),0x1b77400),0x5265c00)),0x5265c00)-0x1b77400,_0x282147['zIYJr'](0x18,0x3c)*0x3c*0x3e8),Date[_0x4835('59','vkOV')]())-_0x7591db;if(_0x282147['byihV'](_0xc3456b,0xea60)){console[_0x4835('5a','[]vT')](_0x4835('5b','QB)$')+_0x282147[_0x4835('5c','VMHA')](_0xc3456b,0x3e8)+'s开始签到...');await $[_0x4835('5d','^7d0')](_0xc3456b);}else{console['log']('马上开始签到...');}};_0xodE='jsjiami.com.v6';
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
