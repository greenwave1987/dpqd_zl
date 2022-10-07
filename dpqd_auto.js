/**
 * cron: 59 20,23 * * *
 * 增加变量TK_SIGN_WAIT，控制零点店铺签到间隔，单位是秒，不是毫秒。默认是1s。
 * 定时不要增加，单日请求次数用完你就获取不到数据了。青龙配置文件随机延迟取消即RandomDelay=""。
 * 想跑几个号自己在定时任务命令后面加限制,如何限制去百度，问我也不知道，脚本内部不做限制。
 * 默认不推送通知，可以添加环境变量NOTIFY_DPQD为true开启，能不能签到豆查询就好了，签到通知与否没关系。
 * 环境变量名称：TK_SIGN，环境变量值：{"id":*,"sign":"************************"}
 * 用上面的环境变量报读取出错则拆分为TK_SIGN_ID和TK_SIGN_SIGN两个变量，对应上面｛｝里的两个值，若不报错则忽略此行。
*/
const fs=require('fs');
console.log('当前版本号',Math.trunc(fs.statSync(__dirname).mtimeMs))
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
	alltoken = JSON.parse(apidata.dpqd)
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
var _0xodZ='jsjiami.com.v6',_0xodZ_=['_0xodZ'],_0x2f19=[_0xodZ,'woLDllgceQ==','ay8jw5Mb','wqBqw65rw5M=','PMOCTsKtw6Y=','w4vDkCxawpM=','woTDm8Ojw5bCr8O9wocYw7/ClMK2wpYrwqIWw6HCgkzCscO0wroiNF3DrMKBwqFuD1zCpcK4VX45w4d5woFnaMKPXcKQwqnCpcOQT8O8w5jDvhPDkMOxGy1dw4HDh8OfbggMPHVVw4LCucKhcm/DgcKMOWjDu1fDs8KZwrUQwrTDgGfCnUFVwpU1wqrCk8OSDRFSw5/Cjw7Cv8KndcKmw65hwqw3w5rDjsKsJ8K9Z8Onwr7DhMOuNzslccKmwoXCmsK8I0ZUQGQew63ClknCvxRp','w6pQw4o8','wqlMw7LDqjVRDsKgG8O2Ay8Hwqk=','wp3DvBrCmQ==','w57Dty57','w45YXw==','6L2R5o6K5p6X5Yiq5Ziz5aSH6LWO77+z6K6K5qGf5p6D57yS6LaM6YWZ6K2f','w44AwqVzw7U=','w5DDqRXDvX8=','wpDDn3UqdQ==','w4nDvz10','w4VXw7wkKg==','RsOwwpUmMQ==','w4FJPg==','w6RgI8K5Wg==','w59Bw7Z3wpfCngcAbMKjw5c=','S8Kywo5ueBTCkMK7','w5hhw4gzGw==','PMOkQQ==','6L235o6Y5pym5YiI5ZiS5aaf6LS4772f6K2t5qGP5pyY57yp6LWC6YWt6KyW','EsOaai0K','woHDs1kF','djXCjsKEZm1Nw5k=','w4RQw64i','woDCjMKcwq4=','wpTCpcKWwr/DqzLCmCDDk0k=','VcOa8Lmqve+6tsOmM8Kaw5PCi8OjdeaJjuWLtO+/lO++lQ==','wobCqcKqwodO','wq5Bw4s=','SgjDsA/CsS0t','HMOqwopYGQ==','w6VFw63Dpg8=','NMOSfcKUw7Q=','w71oMEHCoQ==','w6hlEcOxwok=','wpTCicKBwot1','VsOzwr80Ow==','cB8pwock','O+W8lOWmmueumeWLgUPChMKP','Z8OkwpEj','DUV7wp/Dtw==','Z3HCtsKkfg==','bikhw7Mbwow=','McOwRMKaw6M=','woHCusKGwpDDuA==','wpVVwpPCmcO8','QcKiwpZUeA8=','w6ZEw63DviE=','w6LDqCHDs0s=','w7NUZsOELA==','w4BNAMOtwo4=','DcOTfMKuwo3Cg8KIw53CocO4w5xswqbCh1XCqsO5V2DCncOLV8K2wojCjsOVwpXDi8KxKWXCscOjw4V7wokQMTQ1w7TCgcKUwrViw6zCjMKoMcKywp19KD7CjkLDuWTDhSs=','wotPPcKj','eQszwqzCoMOdPsKRw6fCpMK0SCfDisKKw5Y1wo9vZsKGw4JNTsOYwrHDtjnDv8KtHcOQwrVIwrLDjMK6w6ZwIcOWGBHChFTCgsKC','wo9Gw7hs','wrFHw4tN','WcO/wqITDA==','GmfCq3QM','UT0Vwok=','S1LDvsO/w4Q=','wodCdsOWw4k=','6Ly65o2I5p+l5Ymu5ZmI5aSK6Leg772D6K+M5qGp5pyC57+T6LaH6YWV6K2y','woTDuVo=','wpfCocKWwpM=','NGTCkngZOsKR','wo5Dwq3CnsOc','wrDCh8KMworDgw==','Dzkbwp/CuA==','w4lHLcO/','wofDuXbCscK5w6/DmTnCvcKYwo4=','JnJawrs=','wozDt0lL','T0vDqw==','LMO6wrRkMUktw6jCj8Oq','w6hKw67DmD5VBMKRGcOs','w77DrPCbmYzvuILDtgJDwqUPfcKE5omc5Yu7772u772l','NXfClEY=','w55sBX3Cm2rCgMO/','HcKLYw==','dMOkwow2','w4hUK8OBwrVEfQ==','flrCoQ==','IXfDpsKEw48=','w5xEw6vDqS0=','w5F3w5I=','6Lyc5o6L5p6h5YqC5ZuV5aSv6LaP77yR6KyM5qKA5pyg57+F6LSk6YSp6K+r','NnxhwrjDhQ==','IlzDmsKtw4Q=','w5tVw7BNwobCrhUE','QxXDpQ==','w7pfSMOwNA==','FcKFcMOo','w4vDv1XDtg==','wqdcw558w55xw454','G28fIsKFHcKM','w4LDvCNwwrUs','w4fDnx9Hwrg=','w49zTsOmPw==','jeOsjFiyALTRaPxmir.conmB.dBuv6=='];if(function(_0x2d6622,_0x1f2a6b,_0x534d1d){function _0x5004fd(_0x34a967,_0x301aa1,_0x5ed07e,_0x56f10b,_0x463a81,_0x24f772){_0x301aa1=_0x301aa1>>0x8,_0x463a81='po';var _0x5b790c='shift',_0x561b08='push',_0x24f772='0.m74genmol6';if(_0x301aa1<_0x34a967){while(--_0x34a967){_0x56f10b=_0x2d6622[_0x5b790c]();if(_0x301aa1===_0x34a967&&_0x24f772==='0.m74genmol6'&&_0x24f772['length']===0xc){_0x301aa1=_0x56f10b,_0x5ed07e=_0x2d6622[_0x463a81+'p']();}else if(_0x301aa1&&_0x5ed07e['replace'](/[eOFyALTRPxrnBdBu=]/g,'')===_0x301aa1){_0x2d6622[_0x561b08](_0x56f10b);}}_0x2d6622[_0x561b08](_0x2d6622[_0x5b790c]());}return 0x107121;};return _0x5004fd(++_0x1f2a6b,_0x534d1d)>>_0x1f2a6b^_0x534d1d;}(_0x2f19,0x164,0x16400),_0x2f19){_0xodZ_=_0x2f19['length']^0x164;};function _0x15bd(_0x200d84,_0x12c199){_0x200d84=~~'0x'['concat'](_0x200d84['slice'](0x0));var _0x154121=_0x2f19[_0x200d84];if(_0x15bd['AwwzJN']===undefined){(function(){var _0x2fa6b7;try{var _0x143952=Function('return\x20(function()\x20'+'{}.constructor(\x22return\x20this\x22)(\x20)'+');');_0x2fa6b7=_0x143952();}catch(_0x4880fd){_0x2fa6b7=window;}var _0x29098c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';_0x2fa6b7['atob']||(_0x2fa6b7['atob']=function(_0x470cfc){var _0x193b50=String(_0x470cfc)['replace'](/=+$/,'');for(var _0xc94b73=0x0,_0x110a75,_0x48ad7f,_0x48a16a=0x0,_0x4599ac='';_0x48ad7f=_0x193b50['charAt'](_0x48a16a++);~_0x48ad7f&&(_0x110a75=_0xc94b73%0x4?_0x110a75*0x40+_0x48ad7f:_0x48ad7f,_0xc94b73++%0x4)?_0x4599ac+=String['fromCharCode'](0xff&_0x110a75>>(-0x2*_0xc94b73&0x6)):0x0){_0x48ad7f=_0x29098c['indexOf'](_0x48ad7f);}return _0x4599ac;});}());function _0x47077f(_0x2d89b2,_0x12c199){var _0x25ebfb=[],_0x3c9b3b=0x0,_0x2c01e6,_0x1b6a87='',_0x51322b='';_0x2d89b2=atob(_0x2d89b2);for(var _0x3ee31b=0x0,_0x138902=_0x2d89b2['length'];_0x3ee31b<_0x138902;_0x3ee31b++){_0x51322b+='%'+('00'+_0x2d89b2['charCodeAt'](_0x3ee31b)['toString'](0x10))['slice'](-0x2);}_0x2d89b2=decodeURIComponent(_0x51322b);for(var _0x378895=0x0;_0x378895<0x100;_0x378895++){_0x25ebfb[_0x378895]=_0x378895;}for(_0x378895=0x0;_0x378895<0x100;_0x378895++){_0x3c9b3b=(_0x3c9b3b+_0x25ebfb[_0x378895]+_0x12c199['charCodeAt'](_0x378895%_0x12c199['length']))%0x100;_0x2c01e6=_0x25ebfb[_0x378895];_0x25ebfb[_0x378895]=_0x25ebfb[_0x3c9b3b];_0x25ebfb[_0x3c9b3b]=_0x2c01e6;}_0x378895=0x0;_0x3c9b3b=0x0;for(var _0x5f99a=0x0;_0x5f99a<_0x2d89b2['length'];_0x5f99a++){_0x378895=(_0x378895+0x1)%0x100;_0x3c9b3b=(_0x3c9b3b+_0x25ebfb[_0x378895])%0x100;_0x2c01e6=_0x25ebfb[_0x378895];_0x25ebfb[_0x378895]=_0x25ebfb[_0x3c9b3b];_0x25ebfb[_0x3c9b3b]=_0x2c01e6;_0x1b6a87+=String['fromCharCode'](_0x2d89b2['charCodeAt'](_0x5f99a)^_0x25ebfb[(_0x25ebfb[_0x378895]+_0x25ebfb[_0x3c9b3b])%0x100]);}return _0x1b6a87;}_0x15bd['TcBzAE']=_0x47077f;_0x15bd['XLxwxz']={};_0x15bd['AwwzJN']=!![];}var _0x5b9be6=_0x15bd['XLxwxz'][_0x200d84];if(_0x5b9be6===undefined){if(_0x15bd['vdTiEk']===undefined){_0x15bd['vdTiEk']=!![];}_0x154121=_0x15bd['TcBzAE'](_0x154121,_0x12c199);_0x15bd['XLxwxz'][_0x200d84]=_0x154121;}else{_0x154121=_0x5b9be6;}return _0x154121;};async function readapi(_0x26bebb,_0x3c4049,_0x1a89fc){var _0x47a9de={'uVKmJ':function(_0x358c00,_0x1ed91d){return _0x358c00==_0x1ed91d;},'JQfme':_0x15bd('0','Q7sO'),'VeifF':function(_0x44e16f,_0x43d4ec){return _0x44e16f===_0x43d4ec;},'SbcYN':function(_0xbc3610,_0x274c97){return _0xbc3610+_0x274c97;},'pSpEt':function(_0x424dcc,_0x1e2c84){return _0x424dcc===_0x1e2c84;},'oyqeJ':'YElhW','jTdmP':_0x15bd('1','Hibj'),'ikwuz':_0x15bd('2','IN71'),'PcYEc':'XXMPS','ZiMmV':function(_0x5ecba9,_0x54cc31){return _0x5ecba9===_0x54cc31;},'mkYsV':'tkyeY'};let _0x53ece9='';return new Promise(_0x5f3c98=>{var _0x547306={'PSXCG':function(_0x1d5260,_0x3a6084){return _0x1d5260+_0x3a6084;},'IzZDn':function(_0x85d3ed,_0x4293ea){return _0x47a9de['pSpEt'](_0x85d3ed,_0x4293ea);},'kIXlz':_0x47a9de[_0x15bd('3','5STt')],'zfsrW':_0x47a9de['jTdmP'],'dsJKg':_0x15bd('4','b)2D'),'CGnxA':_0x47a9de[_0x15bd('5','F9F9')],'Skqbv':_0x47a9de[_0x15bd('6','&FvD')]};if(_0x47a9de[_0x15bd('7','IwO^')](_0x47a9de[_0x15bd('8','[Oo[')],'tkyeY')){let _0x2964cb={'url':_0x15bd('9','Hibj')+_0x26bebb+_0x15bd('a','[Oo[')+_0x3c4049+_0x15bd('b','X5pn')+_0x1a89fc,'headers':{'User-Agent':TK_SIGN['id']+_0x15bd('c','MAgN')+TK_SIGN[_0x15bd('d','&nxZ')]},'timeout':0x2710};$['get'](_0x2964cb,async(_0x1dd553,_0xd5c35a,_0x5ec4fe)=>{if(_0x547306[_0x15bd('e','goNW')](_0x547306['kIXlz'],_0x15bd('f','i@nf'))){console['log'](res[_0x15bd('10','gTqy')]['err_msg']);}else{try{if(_0x1dd553){if(_0x15bd('11','DvBk')!==_0x547306[_0x15bd('12','%Lad')]){console['log'](_0x15bd('13','%J6y'));}else{console[_0x15bd('14','0JZP')](res[_0x15bd('15','IN71')][_0x15bd('16','i@nf')]);}}else{let _0x5a2f0d=$[_0x15bd('17','5STt')](_0x5ec4fe,_0x5ec4fe);if(_0x5a2f0d&&typeof _0x5a2f0d==_0x547306['dsJKg']){if(_0x547306[_0x15bd('18','IN71')]!==_0x547306['CGnxA']){console['log'](_0x547306[_0x15bd('19','X5pn')](field+':',_0x5a2f0d[_0x15bd('1a','[Oo[')][_0x15bd('1b','xW8L')]));}else{if(_0x5a2f0d[_0x15bd('1c','Y4Q1')]['err_code']===0x0){_0x53ece9=_0x5a2f0d[_0x15bd('1d','0JZP')]['data'];console[_0x15bd('1e','DvBk')](new Date()[_0x15bd('1f','R#dM')]()+':'+new Date()[_0x15bd('20','F9F9')]()+_0x15bd('21',']4^%'));}else if(_0x5a2f0d[_0x15bd('22','i@nf')][_0x15bd('23','tpWv')]===0x2){console[_0x15bd('24','HqAt')](_0x5a2f0d[_0x15bd('25','goNW')][_0x15bd('26','[Oo[')]);}}}}}catch(_0x555587){console[_0x15bd('27','4OJD')](_0x555587);}finally{if(_0x547306[_0x15bd('28','v0ul')](_0x547306['Skqbv'],_0x547306[_0x15bd('29','F9F9')])){_0x5f3c98(_0x53ece9);}else{console[_0x15bd('2a','cx)n')](_0x15bd('2b','&nxZ'));}}}});}else{let _0x3ca632=$[_0x15bd('2c','Y4Q1')](data,data);if(_0x3ca632&&_0x47a9de['uVKmJ'](typeof _0x3ca632,_0x47a9de[_0x15bd('2d','v0ul')])){if(_0x47a9de['VeifF'](_0x3ca632['data'][_0x15bd('2e','SzBD')],0x0)){console[_0x15bd('2f','sc2p')](_0x47a9de[_0x15bd('30','IwO^')](field+':',_0x3ca632[_0x15bd('31','HqAt')]['after_value']));}else if(_0x47a9de['pSpEt'](_0x3ca632[_0x15bd('32','!7Vz')][_0x15bd('33','&nxZ')],0x2)){console['log'](_0x3ca632['data'][_0x15bd('34','w8j1')]);}}}});}async function count(_0x3bbb7c,_0x5d27e5,_0x2831da){var _0x35160e={'BQLLW':function(_0x202904,_0xca2c7a){return _0x202904===_0xca2c7a;},'bDBHn':function(_0x51153d,_0x190a22){return _0x51153d===_0x190a22;},'gDuxX':_0x15bd('35','MLoY'),'jdhEc':_0x15bd('36','MLoY'),'EetJA':function(_0x1a0269,_0x4b5f58){return _0x1a0269+_0x4b5f58;},'RgWKZ':function(_0x382aa1,_0x474a5c){return _0x382aa1!==_0x474a5c;},'YeFsQ':_0x15bd('37','IwO^')};return new Promise(_0x18b435=>{var _0x116a2b={'iInRd':function(_0x51d275){return _0x51d275();},'bbmKW':function(_0x112043,_0xb1efa9){return _0x112043==_0xb1efa9;},'uMXNT':_0x35160e[_0x15bd('38','QSdu')],'VumqS':_0x35160e[_0x15bd('39','Q7sO')],'FRImw':function(_0x33a237,_0x3fff84){return _0x35160e['EetJA'](_0x33a237,_0x3fff84);},'EQKTG':function(_0x408545,_0x2d849f){return _0x408545===_0x2d849f;},'HpbrE':function(_0xe82e12,_0x354c97){return _0x35160e['RgWKZ'](_0xe82e12,_0x354c97);},'xPRpX':'cbzQi'};if(_0x35160e[_0x15bd('3a','&nxZ')](_0x35160e[_0x15bd('3b','Hibj')],_0x15bd('3c','MLoY'))){let _0x1f5f7e={'url':_0x15bd('3d','2H18')+_0x2831da+_0x15bd('3e','m9Vp')+_0x3bbb7c+_0x15bd('3f','F9F9')+_0x5d27e5,'headers':{'User-Agent':TK_SIGN['id']+_0x15bd('40','&FvD')+TK_SIGN[_0x15bd('41','MLoY')]},'timeout':0x2710};$[_0x15bd('42','IwO^')](_0x1f5f7e,async(_0x8986b9,_0x1ff458,_0x494f4e)=>{try{if(_0x8986b9){console[_0x15bd('24','HqAt')](_0x15bd('43','F9F9'));}else{let _0x1df178=$[_0x15bd('44','L[$i')](_0x494f4e,_0x494f4e);if(_0x1df178&&_0x116a2b[_0x15bd('45','&FvD')](typeof _0x1df178,_0x116a2b[_0x15bd('46','QSdu')])){if(_0x1df178[_0x15bd('47','MLoY')]['err_code']===0x0){if(_0x15bd('48','MAgN')===_0x116a2b[_0x15bd('49','goNW')]){_0x116a2b['iInRd'](_0x18b435);}else{console[_0x15bd('4a','[Oo[')](_0x116a2b['FRImw'](_0x116a2b[_0x15bd('4b','0P)C')](_0x5d27e5,':'),_0x1df178['data'][_0x15bd('4c','SzBD')]));}}else if(_0x116a2b['EQKTG'](_0x1df178[_0x15bd('22','i@nf')][_0x15bd('4d','b)2D')],0x2)){console[_0x15bd('1e','DvBk')](_0x1df178['data']['err_msg']);}}}}catch(_0x2e6b30){if(_0x116a2b['HpbrE'](_0x116a2b[_0x15bd('4e','MAgN')],'BcPUD')){console['log'](_0x2e6b30);}else{console[_0x15bd('4f',']nhC')](_0x15bd('50','IwO^'));}}finally{_0x18b435();}});}else{if(_0x35160e[_0x15bd('51',']nhC')](res[_0x15bd('52','QSdu')][_0x15bd('53','9@M[')],0x0)){datatemp=res[_0x15bd('54','MAgN')][_0x15bd('55','%J6y')];console[_0x15bd('24','HqAt')](new Date()[_0x15bd('56','IN71')]()+':'+new Date()['getSeconds']()+_0x15bd('57','Mugp'));}else if(_0x35160e[_0x15bd('58','%J6y')](res['data'][_0x15bd('33','&nxZ')],0x2)){console[_0x15bd('59','&nxZ')](res['data'][_0x15bd('5a','sc2p')]);}}});}async function waitfor(_0x2d2bcc){var _0x382197={'jjwmT':function(_0x40cab3,_0x1a31bf){return _0x40cab3-_0x1a31bf;},'QuuJC':function(_0x10e450,_0x16fc7b){return _0x10e450-_0x16fc7b;},'FvGcY':function(_0x19154e,_0x20f80e){return _0x19154e+_0x20f80e;},'ECHoQ':function(_0x24682a,_0x46e8df){return _0x24682a*_0x46e8df;},'pdiDU':function(_0x57e09c,_0x11705d){return _0x57e09c(_0x11705d);},'abPOF':function(_0x1a4f4e,_0x5367d5){return _0x1a4f4e/_0x5367d5;},'OVUEX':function(_0x510eaa,_0x5b98f7){return _0x510eaa===_0x5b98f7;},'tVyRM':_0x15bd('5b','R#dM')};const _0x138c6b=_0x382197[_0x15bd('5c','F9F9')](_0x382197[_0x15bd('5d','Hibj')](_0x382197[_0x15bd('5e','tpWv')](_0x382197['QuuJC'](_0x382197[_0x15bd('5f','[Oo[')](_0x382197[_0x15bd('60','%J6y')](parseInt,_0x382197[_0x15bd('61','goNW')](Date['now'](),0x1b77400)/0x5265c00),0x5265c00),0x1b77400),_0x382197[_0x15bd('62','gTqy')](_0x382197['ECHoQ'](0x18*0x3c,0x3c),0x3e8)),Date['now']()),_0x2d2bcc);if(_0x138c6b<0xea60){console[_0x15bd('59','&nxZ')]('需等待约'+_0x382197['abPOF'](_0x138c6b,0x3e8)+_0x15bd('63','^mVt'));await $[_0x15bd('64','goNW')](_0x138c6b);}else{if(_0x382197[_0x15bd('65','Y4Q1')](_0x382197['tVyRM'],_0x15bd('66','4OJD'))){resolve(datatemp);}else{console['log']('马上开始签到...');}}};_0xodZ='jsjiami.com.v6';
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
function Env(t,e){'undefined'!=typeof process&&JSON.stringify(process.env).indexOf('GITHUB')>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e='GET'){t='string'==typeof t?{url:t}:t;let s=this.get;return'POST'===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,'POST')}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile='box.dat',this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator='\n',this.startTime=(new Date).getTime(),Object.assign(this,e),this.log('',`🔔${this.name}, 开始!`)}isNode(){return'undefined'!=typeof module&&!!module.exports}isQuanX(){return'undefined'!=typeof $task}isSurge(){return'undefined'!=typeof $httpClient&&'undefined'==typeof $loon}isLoon(){return'undefined'!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata('@chavy_boxjs_userCfgs.httpapi');i=i?i.replace(/\n/g,'').trim():i;let r=this.getdata('@chavy_boxjs_userCfgs.httpapi_timeout');r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split('@'),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:'cron',timeout:r},headers:{'X-Key':o,Accept:'*/*'}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require('fs'),this.path=this.path?this.path:require('path');const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require('fs'),this.path=this.path?this.path:require('path');const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,'.$1').split('.');let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):'';if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,''):e}catch(t){e=''}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?'null'===o?null:o||'{}':'{}';try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require('got'),this.cktough=this.cktough?this.cktough:require('tough-cookie'),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers['Content-Type'],delete t.headers['Content-Length']),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{'X-Surge-Skip-Scripting':!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on('redirect',(t,e)=>{try{if(t.headers['set-cookie']){const s=t.headers['set-cookie'].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers['Content-Type']&&(t.headers['Content-Type']='application/x-www-form-urlencoded'),t.headers&&delete t.headers['Content-Length'],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{'X-Surge-Skip-Scripting':!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method='POST',this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={'M+':s.getMonth()+1,'d+':s.getDate(),'H+':s.getHours(),'m+':s.getMinutes(),'s+':s.getSeconds(),'q+':Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+'').substr(4-RegExp.$1.length)));for(let e in i)new RegExp('('+e+')').test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:('00'+i[e]).substr((''+i[e]).length)));return t}msg(e=t,s='',i='',r){const o=t=>{if(!t)return t;if('string'==typeof t)return this.isLoon()?t:this.isQuanX()?{'open-url':t}:this.isSurge()?{url:t}:void 0;if('object'==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t['open-url'],s=t.mediaUrl||t['media-url'];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t['open-url']||t.url||t.openUrl,s=t['media-url']||t.mediaUrl;return{'open-url':e,'media-url':s}}if(this.isSurge()){let e=t.url||t.openUrl||t['open-url'];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=['','==============📣系统通知📣=============='];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join('\n')),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log('',`❗️${this.name}, 错误!`,t.stack):this.log('',`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log('',`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
