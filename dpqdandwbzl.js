/**
 * cron: 59 20,22,23 * * *
 * 想跑几个号自己在定时任务命令后面加限制,如何限制去百度，问我也不知道，脚本内部不做限制。跑几个号就几个号给我助力。
 * 默认8点前不推送通知，可以添加环境变量NOTIFY_DPQD为true开启，6点之后默认通知。
 */
const $ = new Env('店铺签到(含挖宝助力）');
const axios = require('axios')
const {SHA256} = require('crypto-js')
const CryptoJS = require('crypto-js')
const notify = $.isNode() ? require('./sendNotify') : '';
const JD_API_HOST = 'https://api.m.jd.com/api?appid=interCenter_shopSign';

let nowHours = new Date().getHours()
let nowMinutes = new Date().getMinutes()
let cookiesArr = []
let shareCodes = []
let token = []
let cookie = ''
let res = ''
let message=''
let notify_dpqd = false
if (process.env.NOTIFY_DPQD){notify_dpqd = process.env.NOTIFY_DPQD} //凌晨签到是否通知，变量设置true则通知，默认不通知，估计影响签到网速，未验证。22点签到通知结果。

let PROXY_HOST ='42.6.114.120'; //例如:127.0.0.1(环境变量名:TG_PROXY_HOST)
let PROXY_PORT ='7314'; //例如:1080(环境变量名:TG_PROXY_PORT)
let PROXY_AUTH = ''; //tg代理配置认证参数

!(async () => {
    cookiesArr = await requireConfig()

    if (nowHours==23&&nowMinutes>55){
    //执行第一步，店铺签到
    console.log(`马上零点，等待开始*******`)
        await waitfor()
        firststep();
    //执行第二步，为token提供者助力挖宝
    console.log(`现在是`+new Date().getMinutes()+'分')
        if(new Date().getMinutes()<1){
            await $.wait((60-new Date().getSeconds())*1000)
            await wbzl()
        }else(await wbzl())	 
    //22点默认不执行，如脚本出错，会修改API再执行一次。
    }else if (nowHours==22&&nowMinutes>55){
        console.log(`等待获取该时间点是否执行命令设置*******`)
        let emergency =await readapi('50038','21502f3b390942c3b9c4ddad7c7f9bb7')
        if(emergency[0].retry==1){
            console.log(`再次执行签到程序******`)
            await firststep();
        }
        if(emergency[1].retry==1){
            console.log(`再次执行助力程序******`)
            await wbzl();
        }
    //手动执行所有都执行一次                  
    }else{
        await firststep();
        await wbzl();
    } 
    //执行第三步，发送通知,8点前不发送通知    
    if (new Date().getHours()<6){
        console.log('现在'+new Date().getHours()+`点,默认不推送！`)
        if(notify_dpqd){
            console.log(`你设置了推送，开始发送通知！`)
            await showMsg()
        }
    }else{await showMsg()};                     
})()
    .catch((e) => {
      $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
      $.done();
    })
  
//店铺签到

async function firststep(){
    // 获取签到token
    token =await readapi('50036','ae77e6c5dffb4b269117f613100f2196')
    token.sort(function () { return Math.random() - 0.5})
    //console.log(token)

    //按用户顺序签到
    for (let [index, value] of cookiesArr.entries()) {
        try {
            cookie = value
            console.log(`\n开始【京东账号${index + 1}】\n`)
            message +=`\n【第${index + 1}京东账号签到结果】\n`
            await dpqd()
            //await $.wait(100)
        } catch (e) {
            console.log('error', e)
        }
    }
}
//按店铺顺序签到
async function dpqd(){
  for (var j = 0; j < token.length; j++) {
    if(new Date().getHours()<9){
        if (token[j].dday==0) {
            console.log('今日无奖励，其他时段再签！！！');
            continue
        }
    }
    await signCollectGift(token[j].token,token[j].shopName,token[j].activity)
    let waittime
    new Date().getHours()==0 ? waittime=500:waittime=getRandomNumberByRange(2000, 6000)
    await $.wait(waittime)
  }
}

//店铺签到
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
        "User-Agent":  getUA()
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

// 发财挖宝助力
async function wbzl(){
    shareCodes = await readapi('50035','5fbed831fb4043d6968ae10ec38ee991')    
    //console.log(shareCodes)
    for (let [index, value] of cookiesArr.entries()) {
        try {
            cookie = value
            console.log(`\n开始【京东账号${index + 1}】\n`)
            await requestAlgo('ce6c2', 'jdltapp;')
            if (shareCodes.length === 0) {console.log('获取助力码失败');break}
            console.log('将帮提供token者助力！！！') 
            shareCodes.sort(function () { return Math.random() - 0.5})
            let codestemp=[]
            codestemp[0]=shareCodes[0]
            for (let code of codestemp) {
                console.log('将帮提供token者助力',code.inviter) 
                res = await api('happyDigHelp', {
                    "linkId": "pTTvJeSTrpthgk9ASBVGsw","inviter": code.inviter,"inviteCode": code.inviteCode})
                if (res.code === 0) {
                    console.log(new Date().Format("hh:mm:ss.S")+'-助力成功')
                    await $.wait(2000)
                    break
                } else if (res.code === 16144) {
                    console.log('上限')
                    await $.wait(2000)
                    break
                } else {
                    console.log(res.code, res.errMsg)
                    await $.wait(2000)
                }   
            }
        } catch (e) {
            console.log('error', e)
        }
    } 
}

async function api(fn, body) {
    let timestamp = Date.now(),
        t = [{key: 'functionId',value: fn},
            {key: 'body',value: SHA256(JSON.stringify(body)).toString()},
            {key: 't',value: timestamp.toString()},
            {key: 'appid',value: 'activities_platform'},
            {key: 'client',value: 'H5'},
            {key: 'clientVersion',value: '1.0.0'},]
    let h5st = geth5st(t, '63d78')
    let {data} = await axios.get(`https://api.m.jd.com/?functionId=${fn}&body=${encodeURIComponent(JSON.stringify(body))}&t=${Date.now()}&appid=activities_platform&client=H5&clientVersion=1.0.0&h5st=${h5st}`, 
        {
        headers: {
            'Host': 'api.m.jd.com',
            'Origin': 'https://bnzf.jd.com',
            'User-Agent': `jdltapp;`,
            'Referer': 'https://bnzf.jd.com/',
            'Cookie': cookie
            }
        })
    return data
}

async function readapi(product_id,secret) {
    let productConfig =[]
    for (let i = 0; i < 5; i++) {
        try {
            //let {data} = await axios.get(`${API_HOST}/remote_config/get?user_id=${app_id}&secret=${secret}&product_id=${product_id}&app_id=${app_id}&app_secret=${app_secret}`)
            let {data} = await axios.get(`${new Buffer.from('aHR0cHM6Ly93d3cubXhuenAuY29tL2FwaS9yZW1vdGVfY29uZmlnL2dldD91c2VyX2lkPW92ZGd1cXBmdXZkZ292eHMmYXBwX2lkPW92ZGd1cXBmdXZkZ292eHMmYXBwX3NlY3JldD1TM294VlhaM2JISmtjemwyZWpOSlVXOHhZV3AxZHowOQ==', 'base64').toString()}&secret=${secret}&product_id=${product_id}`)
            if(data){
                //console.log(data)
                data = JSON.parse(JSON.stringify(data));
                productConfig = JSON.parse(data.data.productConfig) || []
                if (productConfig.length !== 0) {
                    break
                }else{console.log('未获取到数据！！')}
            }
        } catch (e) {
            console.log(e)
            await $.wait(getRandomNumberByRange(2000, 6000))
        }
    }
    return(productConfig)
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


function geth5st(t, appId) {
    let a = ''
    t.forEach(({key,value}) => {
        a += `${key}:${value}&`
    })
    a = a.slice(0, -1)
    let time = Date.now()
    let timestamp = new Date().Format("yyyyMMddhhmmssSSS");
    let hash1 = genKey(tk, fp.toString(), timestamp.toString(), appId.toString(), CryptoJS).toString(
        CryptoJS.enc.Hex);
    const hash2 = CryptoJS.HmacSHA256(a, hash1).toString();
    return encodeURIComponent(["".concat(timestamp.toString()), "".concat(fp.toString()), "".concat(
        appId.toString()), "".concat(tk), "".concat(hash2), "3.0", "".concat(time.toString())].join(
        ";"))
}

async function requestAlgo(appId, USER_AGENT = 'jdpingou;') {
    function generateFp() {
        let e = "0123456789";
        let a = 13;
        let i = '';
        for (; a--;)
            i += e[Math.random() * e.length | 0];
        return (i + Date.now()).slice(0, 16)
    }

    fp = generateFp()
    let {data} = await axios.post(`https://cactus.jd.com/request_algo?g_ty=ajax`, `{
        "version":"3.0",
        "fp":"${fp}",
        "appId":"${appId.toString()}",
        "timestamp":${Date.now()},
        "platform":"web",
        "expandParams":""
        }`, {
            headers: {
                'host': 'cactus.jd.com',
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': USER_AGENT
            }
        })
    tk = data.data.result.tk;
    genKey = new Function(`return ${data.data.result.algo}`)();
    return {
        fp,
        tk,
        genKey
    }
}

function getRandomNumberByRange(start, end) {
    return Math.floor(Math.random() * (end - start) + start)
}

//定义agent代理函数
async function proxy(options) {
    //console.log(yxl.GetDateTime(new Date())+'开始设置代理')
  if (PROXY_HOST && PROXY_PORT) {
    const tunnel = require("tunnel");
    const agent = {
      https: tunnel.httpsOverHttp({
        proxy: {
          host: PROXY_HOST,
          port: PROXY_PORT * 1,
          proxyAuth: PROXY_AUTH
        }
      })
    }
    Object.assign(options, {agent})
  }
  //console.log(yxl.GetDateTime(new Date())+'设置代理完成')
}
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
//定义等待函数，如果当前分钟数大于58，则等待设定秒数
async function waitfor(starttime = 59.85) {
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
	    log=log.replace("对不起，你已经参加过该活动啦，去看看别的吧"," 今日已签过");
        log=log.replace("当前不存在有效的活动"," 已被撸空了");
    }
    return log
}
function randomString(e) {
  e = e || 32;
  let t = "abcdef0123456789", a = t.length, n = "";
  for (i = 0; i < e; i++)
    n += t.charAt(Math.floor(Math.random() * a));
  return n
}

function getUA() {
    let UA = `jdapp;iPhone;10.2.2;13.1.2;${randomString(40)};M/5.0;network/wifi;ADID/;model/iPhone8,1;addressid/2308460611;appBuild/167863;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1;`
    return UA
}
// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t){let e={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in e)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?e[s]:("00"+e[s]).substr((""+e[s]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r)));let h=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];h.push(e),s&&h.push(s),i&&h.push(i),console.log(h.join("\n")),this.logs=this.logs.concat(h)}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
