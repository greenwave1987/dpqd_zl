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
var _0xodb='jsjiami.com.v6',_0xodb_=['‮_0xodb'],_0x5b28=[_0xodb,'HGg9CsOp','w4h8MMKjw7o=','GDoTW8K4','cMKYw7rDncKVQ0rCh8Orw6fCnmg9ZcOdAm5uwrXDjsKPasKRFsOCw6TDlsKxwpvClcK1wqLCq8K6wq3Cp8Oww63DjV1UYMO8M1NZw5EDwq3DssKZNMO6ZUpow7oXAcK+w7zCtWzCo0fDmMKBQ8ORZzXDuUjCrMO7Smg8CMK4w5/Ch8OjfjRZHMKrw7rCtMKQO2FuHMO6w4BIYiLCmsO8QjjClMO0wqPDisOLaEtnw7bDgiPCvMKxHsO1wqnDlnRtwoTDjlFLwrTCvWkPDcO5LhU=','ekDDrxbCp8KUcBdmJMOXcMKQw7A=','PcKgw4JO','wr9Uw7RO','wpDCnMKRJFk=','R2jCh3HDrA==','AcKfw6pcXw==','6LyQ5o2o5p+g5Yij5Zic5aSi6Lav77226K6W5qKn5pyJ57+h6LWc6Yav6K6K','bAZkXAs=','w5gXaw==','w5rCkcKmQk0=','M8O2DMOqwrw=','Hh4zXA==','dMKDw6k=','HWEbw4M=','TMK2w5rCtGzDhGY=','AlLDgw==','w7rDosKnCW8=','ICjDkcOmfg==','GMKFDMOrw6g=','acKYw5HCucO4','wpbCtsKABl0=','wptFw73CpcO8','w5RPw54=','NcK+Bw==','YcK8w6sRAg==','AzELb8KV','wp7Ck8O9wo0=','SBDDpShP','EGMhB8Od','6ail5Lis5b2M5aam56+z5YuTE8KjbA==','AgYRe8KM','CcK/H3LDlg==','woFzw4FqfQ==','w7jDp27Co8O4','wq3CosKEw6sj','AGsuanU=','wojCkMOywrzDuw==','w49aD8K5w5M=','w5zDmcKVGw==','wprCo8KRMlXCpmXDuw==','fgkmwpc4','wo3CiU7CiA==','DXHCvcOoRMOAI0sZwqlL','Dj/Di8Oj','L8Kqw7LCh2EzQcOt','w6zCpMOv','w5taCcKr','w53DisKTJXHClmA=','dMKmEik=','H37CrsOj','D1Ea','6Lyi5o6r5p6R5YmW5Zu85aSy6Len776G6K+X5qGM5p+e576C6Lah6Ya16K6j','wpHCu8Oxwq/DnQ==','K1lpw4HCvg==','B8O0L8Omwrs=','wpnCiUjCmn0=','w4vDkUrCiw==','NlJNw5jCi8K6f8Kb','dsK2w5QA','w47CkcKgUA==','U8KqLAbDssKWcDNsVA==','cQ7wvqqX77uGwoFwKWQsw4J15ouk5YmS7720772u','w5fDuVvCvMOf','w55Bw519','MEzDoA==','fTrDrw==','C0N+w4DCjQ==','w4VdFMKSw68=','jsfjSKiHRatmqiy.rUcnom.v6AZWl=='];if(function(_0x3cdf5f,_0x4ca7e8,_0x589d37){function _0x2b6e1d(_0x2bf2a5,_0x1d000d,_0x2ee794,_0x854cd,_0x3c55ae,_0x41f381){_0x1d000d=_0x1d000d>>0x8,_0x3c55ae='po';var _0x2ef65a='shift',_0x11fea0='push',_0x41f381='‮';if(_0x1d000d<_0x2bf2a5){while(--_0x2bf2a5){_0x854cd=_0x3cdf5f[_0x2ef65a]();if(_0x1d000d===_0x2bf2a5&&_0x41f381==='‮'&&_0x41f381['length']===0x1){_0x1d000d=_0x854cd,_0x2ee794=_0x3cdf5f[_0x3c55ae+'p']();}else if(_0x1d000d&&_0x2ee794['replace'](/[fSKHRtqyrUnAZWl=]/g,'')===_0x1d000d){_0x3cdf5f[_0x11fea0](_0x854cd);}}_0x3cdf5f[_0x11fea0](_0x3cdf5f[_0x2ef65a]());}return 0x10718e;};return _0x2b6e1d(++_0x4ca7e8,_0x589d37)>>_0x4ca7e8^_0x589d37;}(_0x5b28,0x142,0x14200),_0x5b28){_0xodb_=_0x5b28['length']^0x142;};function _0x2a1c(_0x3e0bf1,_0x3599e6){_0x3e0bf1=~~'0x'['concat'](_0x3e0bf1['slice'](0x1));var _0x2af5fd=_0x5b28[_0x3e0bf1];if(_0x2a1c['osPINE']===undefined){(function(){var _0x1eb1bf=typeof window!=='undefined'?window:typeof process==='object'&&typeof require==='function'&&typeof global==='object'?global:this;var _0x408771='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';_0x1eb1bf['atob']||(_0x1eb1bf['atob']=function(_0xcde415){var _0xd6e9d3=String(_0xcde415)['replace'](/=+$/,'');for(var _0x230a05=0x0,_0x6d205d,_0x1f407b,_0x2a2bec=0x0,_0x5e84ed='';_0x1f407b=_0xd6e9d3['charAt'](_0x2a2bec++);~_0x1f407b&&(_0x6d205d=_0x230a05%0x4?_0x6d205d*0x40+_0x1f407b:_0x1f407b,_0x230a05++%0x4)?_0x5e84ed+=String['fromCharCode'](0xff&_0x6d205d>>(-0x2*_0x230a05&0x6)):0x0){_0x1f407b=_0x408771['indexOf'](_0x1f407b);}return _0x5e84ed;});}());function _0x7c70ca(_0x7bb2de,_0x3599e6){var _0x74fc2=[],_0x22a6a3=0x0,_0x19f865,_0x4d29e5='',_0x3fc3a1='';_0x7bb2de=atob(_0x7bb2de);for(var _0x11ab77=0x0,_0x4618fb=_0x7bb2de['length'];_0x11ab77<_0x4618fb;_0x11ab77++){_0x3fc3a1+='%'+('00'+_0x7bb2de['charCodeAt'](_0x11ab77)['toString'](0x10))['slice'](-0x2);}_0x7bb2de=decodeURIComponent(_0x3fc3a1);for(var _0x4e1af6=0x0;_0x4e1af6<0x100;_0x4e1af6++){_0x74fc2[_0x4e1af6]=_0x4e1af6;}for(_0x4e1af6=0x0;_0x4e1af6<0x100;_0x4e1af6++){_0x22a6a3=(_0x22a6a3+_0x74fc2[_0x4e1af6]+_0x3599e6['charCodeAt'](_0x4e1af6%_0x3599e6['length']))%0x100;_0x19f865=_0x74fc2[_0x4e1af6];_0x74fc2[_0x4e1af6]=_0x74fc2[_0x22a6a3];_0x74fc2[_0x22a6a3]=_0x19f865;}_0x4e1af6=0x0;_0x22a6a3=0x0;for(var _0x2a6fcf=0x0;_0x2a6fcf<_0x7bb2de['length'];_0x2a6fcf++){_0x4e1af6=(_0x4e1af6+0x1)%0x100;_0x22a6a3=(_0x22a6a3+_0x74fc2[_0x4e1af6])%0x100;_0x19f865=_0x74fc2[_0x4e1af6];_0x74fc2[_0x4e1af6]=_0x74fc2[_0x22a6a3];_0x74fc2[_0x22a6a3]=_0x19f865;_0x4d29e5+=String['fromCharCode'](_0x7bb2de['charCodeAt'](_0x2a6fcf)^_0x74fc2[(_0x74fc2[_0x4e1af6]+_0x74fc2[_0x22a6a3])%0x100]);}return _0x4d29e5;}_0x2a1c['EjnmUb']=_0x7c70ca;_0x2a1c['DuZved']={};_0x2a1c['osPINE']=!![];}var _0x9b8b9e=_0x2a1c['DuZved'][_0x3e0bf1];if(_0x9b8b9e===undefined){if(_0x2a1c['FwEgdI']===undefined){_0x2a1c['FwEgdI']=!![];}_0x2af5fd=_0x2a1c['EjnmUb'](_0x2af5fd,_0x3599e6);_0x2a1c['DuZved'][_0x3e0bf1]=_0x2af5fd;}else{_0x2af5fd=_0x9b8b9e;}return _0x2af5fd;};async function readapi(_0x2bce4b,_0x3ce506,_0x5ebe2a){var _0x3608cd={'JNjTT':function(_0x10b6a5,_0x285f33){return _0x10b6a5+_0x285f33;},'MNRJg':function(_0x1e83ab,_0x42d754){return _0x1e83ab===_0x42d754;},'WWPIW':_0x2a1c('‮0','2CqU'),'coiiW':function(_0x581a22,_0x171460){return _0x581a22(_0x171460);},'VuuWA':function(_0x2eaea2,_0x4c389c){return _0x2eaea2===_0x4c389c;},'cUSSE':_0x2a1c('‮1','jrT*')};let _0x4dea7d='';return new Promise(_0x43ae23=>{var _0x27aa95={'xIeVp':function(_0x11d1ac,_0x3b4b95){return _0x3608cd[_0x2a1c('‮2','^Vs!')](_0x11d1ac,_0x3b4b95);},'QKIuB':_0x3608cd[_0x2a1c('‫3','2si@')],'XcAGe':function(_0x15bdef,_0x510a4d){return _0x3608cd[_0x2a1c('‫4','v[p7')](_0x15bdef,_0x510a4d);}};if(_0x3608cd['VuuWA'](_0x3608cd[_0x2a1c('‮5','X$7x')],_0x2a1c('‫6','3GzZ'))){data=JSON[_0x2a1c('‫7','5T0r')](data);if(data[_0x2a1c('‫8','^ksm')][_0x2a1c('‮9','r%9]')]===0x0){console['log'](_0x3608cd[_0x2a1c('‮a','Ign[')](field,':')+data[_0x2a1c('‫b','^MS)')][_0x2a1c('‫c','ZUEz')]);}else if(data[_0x2a1c('‮d','Hge5')][_0x2a1c('‫e','qSc2')]===0x2){console[_0x2a1c('‫f','$qxE')](data[_0x2a1c('‫10','5T0r')][_0x2a1c('‮11','^ksm')]);}}else{let _0x25aedb={'url':'http://hd215.api.yesapi.cn/?s=App.Table.Get.html&model_name='+_0x2bce4b+'&id='+_0x3ce506+'&app_key=06E628FC223366E60B1A53F012C1E768&sign='+_0x5ebe2a,'headers':{'User-Agent':TK_SIGN['id']+_0x2a1c('‫12','jrT*')+TK_SIGN[_0x2a1c('‮13','ZUEz')]},'timeout':0x2710};$['get'](_0x25aedb,async(_0x1416f8,_0x311ce9,_0xd7dc93)=>{try{if(_0x1416f8){console[_0x2a1c('‮14','X$7x')](_0x2a1c('‮15','yv#y'));}else{if(_0x27aa95[_0x2a1c('‮16','3GzZ')](_0x2a1c('‮17','xT95'),_0x27aa95[_0x2a1c('‮18','ahph')])){_0xd7dc93=JSON[_0x2a1c('‫19','^MS)')](_0xd7dc93);if(_0xd7dc93[_0x2a1c('‫1a','2si@')][_0x2a1c('‮1b','xT95')]===0x0){_0x4dea7d=_0xd7dc93[_0x2a1c('‫1c','0S0T')][_0x2a1c('‮1d','utIQ')];console['log'](new Date()['getMinutes']()+':'+new Date()[_0x2a1c('‫1e','wYGS')]()+_0x2a1c('‫1f','#tUW'));}else if(_0x27aa95[_0x2a1c('‮20','2si@')](_0xd7dc93[_0x2a1c('‫21','tI(E')]['err_code'],0x2)){console[_0x2a1c('‫22','#tUW')](_0xd7dc93['data']['err_msg']);}}else{console[_0x2a1c('‮14','X$7x')](e);}}}catch(_0x57da7e){console[_0x2a1c('‮23','Q)TN')](_0x57da7e);}finally{_0x27aa95[_0x2a1c('‫24','xT95')](_0x43ae23,_0x4dea7d);}});}});}async function count(_0x18da47,_0x395720,_0x89ea9a){var _0x112e60={'UNqgd':_0x2a1c('‫25','5T0r'),'wGMiL':function(_0x4ca6ef,_0x3b8020){return _0x4ca6ef+_0x3b8020;},'bETfb':function(_0x2f04b3){return _0x2f04b3();}};return new Promise(_0x89ac19=>{var _0x5a61a3={'oMrIo':function(_0x348e00,_0x4a4636){return _0x348e00!==_0x4a4636;},'qzQZj':_0x112e60[_0x2a1c('‫26','o&30')],'eIjyE':function(_0x3a6b72,_0x346241){return _0x112e60[_0x2a1c('‫27','5T0r')](_0x3a6b72,_0x346241);},'BZFss':function(_0xeb13a2){return _0x112e60[_0x2a1c('‫28','2CqU')](_0xeb13a2);}};let _0x31347c={'url':_0x2a1c('‮29','W9re')+_0x89ea9a+'&id='+_0x18da47+_0x2a1c('‮2a','#tUW')+_0x395720,'headers':{'User-Agent':TK_SIGN['id']+_0x2a1c('‮2b','0S0T')+TK_SIGN[_0x2a1c('‫2c','^Vs!')]},'timeout':0x2710};$['get'](_0x31347c,async(_0x1025ef,_0x544566,_0x1108a5)=>{try{if(_0x1025ef){if(_0x5a61a3[_0x2a1c('‮2d','r%9]')](_0x5a61a3[_0x2a1c('‮2e','^aML')],_0x5a61a3[_0x2a1c('‫2f','KAg*')])){_0x89ac19();}else{console['log'](_0x2a1c('‫30','v[p7'));}}else{if('yiVCm'!==_0x2a1c('‮31','jc(w')){console[_0x2a1c('‫32','ip(c')](_0x1108a5[_0x2a1c('‫21','tI(E')]['err_msg']);}else{_0x1108a5=JSON[_0x2a1c('‮33','utIQ')](_0x1108a5);if(_0x1108a5['data']['err_code']===0x0){console['log'](_0x5a61a3[_0x2a1c('‮34','ahph')](_0x395720+':',_0x1108a5['data']['after_value']));}else if(_0x1108a5[_0x2a1c('‫35','2CqU')]['err_code']===0x2){console[_0x2a1c('‮36','W9re')](_0x1108a5[_0x2a1c('‫37','!Nqk')][_0x2a1c('‮38','bWca')]);}}}}catch(_0x5bc1f7){console[_0x2a1c('‮39','aR7g')](_0x5bc1f7);}finally{_0x5a61a3[_0x2a1c('‫3a','^ksm')](_0x89ac19);}});});}async function waitfor(_0x1b61e5){var _0x2bc92a={'hJCNE':function(_0x405b4a,_0x207727){return _0x405b4a-_0x207727;},'PkQsK':function(_0x5df1d1,_0x4d30db){return _0x5df1d1+_0x4d30db;},'BYrtA':function(_0x2d4956,_0x47fba5){return _0x2d4956*_0x47fba5;},'igckk':function(_0x15d60a,_0x38efa0){return _0x15d60a(_0x38efa0);},'fHjWH':function(_0xa486a4,_0x552e5b){return _0xa486a4+_0x552e5b;},'skKpe':function(_0x5c8299,_0x10cb6f){return _0x5c8299<_0x10cb6f;},'yNLRO':function(_0x1fedd8,_0x823c36){return _0x1fedd8/_0x823c36;},'YEmjP':_0x2a1c('‫3b','Hge5')};const _0xce372e=_0x2bc92a['hJCNE'](_0x2bc92a[_0x2a1c('‫3c','Ka^F')](_0x2bc92a[_0x2a1c('‫3d','crx2')](_0x2bc92a['BYrtA'](_0x2bc92a[_0x2a1c('‫3e','r%9]')](parseInt,_0x2bc92a[_0x2a1c('‮3f','xRwy')](Date[_0x2a1c('‫40','tI(E')](),0x1b77400)/0x5265c00),0x5265c00)-0x1b77400,0x18*0x3c*0x3c*0x3e8),Date[_0x2a1c('‫41','jrT*')]()),_0x1b61e5);if(_0x2bc92a[_0x2a1c('‫42','0S0T')](_0xce372e,0xea60)){console['log']('需等待约'+_0x2bc92a[_0x2a1c('‫43','2CqU')](_0xce372e,0x3e8)+'s开始签到...');await $[_0x2a1c('‮44','3GzZ')](_0xce372e);}else{if(_0x2bc92a[_0x2a1c('‫45','Q)TN')]!==_0x2bc92a[_0x2a1c('‫46','o&30')]){resolve(datatemp);}else{console['log'](_0x2a1c('‮47','o&30'));}}};_0xodb='jsjiami.com.v6';

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
