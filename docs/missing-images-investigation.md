# 缺失图片问题调查与修复方案

> 调查日期：2026-08-19 ｜ 站点：dir.vastnext.com ｜ 数据：冷启动导入的 1144 条 item

## 一、现状

| 字段 | 有图 | 缺图 |
|---|---|---|
| image（16:9 封面截图） | 637 | **507（44%）** |
| icon（favicon/logo） | 11 | **1133（99%）** |

## 二、根因总览（507 条缺 image，全量并发实测）

| 根因组 | 数量 | 占比 | 含义 |
|---|---|---|---|
| 1-no-og-tag | 229 | 45% | 页面无 og:image 标签 |
| 2-fetch-fail | 129 | 25% | 页面本身抓不到（被墙/超时/下线） |
| 3-page-error | 81 | 16% | 页面返回 4xx/5xx（含 CF 挑战页） |
| 4-ogimg-broken | 28 | 6% | og:image URL 已失效（404/5xx） |
| 5-ogimg-badtype | 15 | 3% | og:image 是 SVG/HTML，Sanity 拒收 |
| 6-transient | 25 | 5% | 导入当时偶发失败，现实测正常 |

## 三、icon 缺失 99% 根因

兜底源 icons.duckduckgo.com 本机被墙（实测直连 000），node-fetch 不走系统代理 → 静默失败。逻辑正确、网络不通。

## 四、修复方案（含实测）

| 方案 | 用途 | 实测 | 备注 |
|---|---|---|---|
| **Thum.io 截图** | 补 image | **直连 200 PNG 1.8s** ✓ | https://image.thum.io/get/width/1200/crop/675/{url} 免配置 |
| **Google s2 favicon** | 补 icon | **挂 7890 代理 200 PNG** ✓（需 -L 跟 301） | sz=128 质量最佳 |
| **来源目录页取图** | 补 image（新增） | 待测 | futurepedia/futuretools/toolify 等条目页自带截图，见第六节 |
| 前端占位卡 | 保底 | - | ItemCard 无图渲染首字母色块 |

建议顺序：来源目录页取图（精准已有现成图）→ Thum.io 补剩余 → Google s2 补 icon → 前端占位兜底。

## 五、缺图明细（按根因分组，共 507 条）

### 组1：无 og:image 标签（229 条）——页面没有可提取的封面图

| name | url | 失败详情 | 来源目录页数 |
|---|---|---|---|
| orchids | https://www.wikihow.com/Care-for-Orchids | no-og-tag | 2 |
| hoopsai | https://hoopsai.net | no-og-tag | 2 |
| heycli | https://www.heycli.com | no-og-tag | 2 |
| hatch | https://www.hatch.com | no-og-tag | 2 |
| i10x | https://i10x.ai | no-og-tag | 2 |
| imaginario ai | https://imaginario.ai | no-og-tag | 2 |
| ingestai | https://ingestai.app | no-og-tag | 2 |
| kive | https://kive.ai | no-og-tag | 2 |
| ink | https://www.inktechnologies.com | no-og-tag | 2 |
| magify design | https://magify.design/?ref=infilimits | no-og-tag | 2 |
| locus | https://locus.luc.edu | no-og-tag | 2 |
| merlin | https://me2.ihgmerlin.com/static/login/loginforms/logout.html | no-og-tag | 2 |
| maigic book | https://thedailymagician.com/best-magic-books | no-og-tag | 2 |
| memflow | https://memflow.io | no-og-tag | 2 |
| papercup | https://staging.papercup.com | no-og-tag | 2 |
| meet millie | https://nostalgiacentral.com/television/tv-by-decade/tv-shows-1950s/meet-millie | no-og-tag | 2 |
| kili | https://kili-technology.com | no-og-tag | 2 |
| plusvector | https://plusvector.com | no-og-tag | 2 |
| pixela ai | https://pixella.ai | no-og-tag | 3 |
| rytr | https://rytr.me | no-og-tag | 3 |
| namelix | https://namelix.com | no-og-tag | 3 |
| tabnine | https://www.tabnine.com | no-og-tag | 3 |
| summify | https://summify.io | no-og-tag | 3 |
| wordai | https://wordai.com | no-og-tag | 3 |
| ace studio | https://acestudio.ai | no-og-tag | 2 |
| adobe podcast | https://podcast.adobe.com/en | no-og-tag | 2 |
| yarnit | https://www.yarnit.app | no-og-tag | 3 |
| angry email translator | https://angryemailtranslator.com | no-og-tag | 2 |
| ai studios | https://app.aistudios.com/dashboard | no-og-tag | 2 |
| bookabout | https://bookabout.io | no-og-tag | 2 |
| beepbooply | https://beepbooply.com | no-og-tag | 2 |
| capcut | https://www.capcut.com | no-og-tag | 2 |
| census gpt | https://censusgpt.com | no-og-tag | 2 |
| capgo ai | https://capgo.ai | no-og-tag | 2 |
| build chatbot | https://www.chatbot.com/help/build-your-chatbot/how-to-build-your-chatbot | no-og-tag | 2 |
| caffeine | https://zhornsoftware.co.uk/caffeine | no-og-tag | 2 |
| chatmate ai | https://www.chatmate.ai | no-og-tag | 2 |
| datingbyai | https://dating.ai | no-og-tag | 2 |
| durable ai | https://durable.ai | no-og-tag | 2 |
| dubbing ai | https://dubbingai.io | no-og-tag | 2 |
| enso | https://ensorings.com | no-og-tag | 2 |
| everlearns | https://everlearns.com | no-og-tag | 2 |
| fastcut | https://www.fastcam.com/new/fastcut-optimizer-for-metal-glass-wood.html | no-og-tag | 2 |
| excel formularizer | https://formularizer.com/sign-up | no-og-tag | 2 |
| fixkey | https://www.fixkey.ai | no-og-tag | 2 |
| findameal | https://findameal.eu | no-og-tag | 2 |
| fliz | https://fliz.ai | no-og-tag | 2 |
| immersive translate | https://immersivetranslate.com/en | no-og-tag | 2 |
| inbox narrator | https://inboxnarrator.com | no-og-tag | 2 |
| intellimail | https://my.intellimali.co.za | no-og-tag | 2 |
| juice | https://www.mp3juices.me/en | no-og-tag | 2 |
| landing ai | https://landing.ai | no-og-tag | 2 |
| lex | https://sso.lex.education | no-og-tag | 2 |
| leni | https://leni.co | no-og-tag | 2 |
| linfo ai | https://linfo.ai | no-og-tag | 2 |
| mindos | https://mindos.you | no-og-tag | 2 |
| mealsai | https://www.mealsai.com | no-og-tag | 2 |
| numerousflow | https://www.numerous.com | no-og-tag | 2 |
| parea ai | https://www.parea.ai | no-og-tag | 2 |
| optimo | https://my.optimoroute.com | no-og-tag | 2 |
| pictales | https://pictales.online | no-og-tag | 2 |
| podsqueeze | https://podsqueeze.com | no-og-tag | 2 |
| potion | https://dashboard.potion.so/login | no-og-tag | 2 |
| powermode ai | https://powermodeai.com | no-og-tag | 2 |
| powerpen | https://www.lakeshorelearning.com/products/accessories/power-pen/p/BD530 | no-og-tag | 2 |
| puddl | https://www.puddl.net | no-og-tag | 2 |
| procys | https://procys.com | no-og-tag | 2 |
| read easy ai | https://readeasy.ai | no-og-tag | 2 |
| reinforz | https://www.reinforz.ai | no-og-tag | 2 |
| runware | https://runware.ai | no-og-tag | 2 |
| steve | https://www.stevemadden.com | no-og-tag | 2 |
| soundful | https://soundful.com | no-og-tag | 2 |
| userdesk | https://userdesk.io | no-og-tag | 2 |
| topview ai | https://www.topview.ai | no-og-tag | 2 |
| visionstory | https://www.visionstory.ai | no-og-tag | 2 |
| workhub | https://www.workhub.com | no-og-tag | 2 |
| zencall ai | https://www.zencall.ai | no-og-tag | 2 |
| webwhiz | https://app.webwhiz.ai/login | no-og-tag | 2 |
| imgcreator ai | https://imgcreatorai.io | no-og-tag | 2 |
| vizard | https://vizard.ai | no-og-tag | 2 |
| ai phone | https://www.aiphone.com | no-og-tag | 3 |
| cheat layer | https://cheatlayer.com | no-og-tag | 3 |
| cockatoo | https://www.cockatoo.com | no-og-tag | 3 |
| comment generator | https://thecommentgenerator.com | no-og-tag | 3 |
| mindgrasp | https://www.mindgrasp.ai | no-og-tag | 3 |
| chorus | https://portail.chorus-pro.gouv.fr | no-og-tag | 3 |
| nanonets | https://nanonets.com | no-og-tag | 3 |
| webscrapeai | https://webscrapeai.com | no-og-tag | 2 |
| public prompts | https://www.publicprompts.art | no-og-tag | 3 |
| voxify | https://voxify.ai | no-og-tag | 3 |
| aipdf | https://aipdf.com/en | no-og-tag | 2 |
| altered | https://www.altered.gg/en-us | no-og-tag | 2 |
| ai ghostwriter | https://www.ghostthewriter.com | no-og-tag | 2 |
| bloggerai | https://bloggerai.app | no-og-tag | 2 |
| alphactr | https://alphactr.com | no-og-tag | 2 |
| shadow | https://shadow.tech/us | no-og-tag | 3 |
| spikes studio | https://www.spikes.studio | no-og-tag | 3 |
| aire | https://www.esteri.it/en/servizi-opportunita/italiani-all-estero/aire_0 | no-og-tag | 2 |
| commenter ai | https://www.commenter.ai | no-og-tag | 2 |
| cometapi | https://www.cometapi.com | no-og-tag | 2 |
| callzen ai | https://convozen.ai | no-og-tag | 2 |
| chatpad ai | https://chatpad.ai | no-og-tag | 2 |
| content at scale | https://contentatscale.ai/about/?fpr=register | no-og-tag | 2 |
| delibr ai | https://www.delibr.com | no-og-tag | 2 |
| dzine ai | https://www.dzine.ai/faq | no-og-tag | 2 |
| gajix | https://gajix.com | no-og-tag | 2 |
| dreamstudio | https://dreamstudio.com/start | no-og-tag | 2 |
| gorilla terminal | https://gorillaterminal.com | no-og-tag | 2 |
| elephas | https://elephas.com | no-og-tag | 2 |
| haiper | https://haiper.ai | no-og-tag | 2 |
| hyperaide | https://hyperaide.com | no-og-tag | 2 |
| hypertype | https://www.hypertype.ai | no-og-tag | 2 |
| iconkit | https://www.iconkit.io | no-og-tag | 2 |
| hostinger | https://www.hostinger.com | no-og-tag | 2 |
| gptgame | https://www.gptgame.app | no-og-tag | 2 |
| intentional ai | https://intentionai.ai | no-og-tag | 2 |
| impossible images | https://im-possible.info/english | no-og-tag | 2 |
| kbasebot | https://kbai.dev | no-og-tag | 2 |
| lalal ai | https://www.lalal.ai | no-og-tag | 2 |
| lettria | https://www.lettria.com | no-og-tag | 2 |
| listingcopy ai | https://listingcopy.ai | no-og-tag | 2 |
| lxi ai | https://lxi.ai | no-og-tag | 2 |
| litrpg adventures | https://www.litrpgadventures.com | no-og-tag | 2 |
| marscode | https://www.marscode.cn/login | no-og-tag | 2 |
| metabob | https://metabob.com | no-og-tag | 2 |
| midjourney prompt helper | https://pmidjourney.com | no-og-tag | 2 |
| mailr | https://mail.ru | no-og-tag | 2 |
| moncelo | https://moncelo.com/?ref=monkeyai | no-og-tag | 2 |
| openl | https://openl.io | no-og-tag | 2 |
| notability | https://notability.com | no-og-tag | 2 |
| octiai | https://app.octiai.com | no-og-tag | 2 |
| pal | https://www.philippineairlines.com/ph/en/home.html | no-og-tag | 2 |
| peech | https://getpeech.com | no-og-tag | 2 |
| pico | https://www.picoxr.com/global | no-og-tag | 2 |
| pandada ai | https://pandada.ai | no-og-tag | 2 |
| outboundly | https://outboundly.ai | no-og-tag | 2 |
| phind | https://phindai.org | no-og-tag | 2 |
| playlistai | https://www.playlistai.app | no-og-tag | 2 |
| paka ai | https://paka.ai | no-og-tag | 2 |
| promptomania | https://promptomania.com | no-og-tag | 2 |
| query kitty | http://querykitty.com | no-og-tag | 2 |
| quizbot | https://quizbot.ai | no-og-tag | 2 |
| quizgrowth | https://www.howtomakemoneywith.ai/blog/how-to-use-quizgrowth | no-og-tag | 2 |
| releasenote ai | https://www.releasenote.ai | no-og-tag | 2 |
| smudge ai | https://smudge.ai | no-og-tag | 2 |
| sqriblr | https://sqriblr.com/?ref=producthunt | no-og-tag | 2 |
| stable attribution | https://www.stableattribution.com | no-og-tag | 2 |
| styldod | https://www.styldod.com | no-og-tag | 2 |
| superreply | https://www.superreply.co | no-og-tag | 2 |
| stable horde | https://stablehorde.net | no-og-tag | 2 |
| studyx | https://studyx.ai | no-og-tag | 2 |
| talknotes | https://talknotes.io | no-og-tag | 2 |
| talkpal | https://talkpal.ai | no-og-tag | 2 |
| the new black | https://thenewblack.ai | no-og-tag | 2 |
| tweetemote | https://www.tweetemote.com | no-og-tag | 2 |
| typeblock | https://www.typeblock.co/?ref=betalist | no-og-tag | 2 |
| vid ai | https://vid.ai | no-og-tag | 2 |
| wondershare virbo | https://virbo.wondershare.com | no-og-tag | 2 |
| video2recipe | https://www.video2recipe.com | no-og-tag | 2 |
| theoassist | https://theoassist.com | no-og-tag | 2 |
| workgpt | https://app.workgpt.ai | no-og-tag | 2 |
| vocalo | https://vocalo.org | no-og-tag | 2 |
| waymark | https://waymark.com | no-og-tag | 2 |
| storyai | https://storyai.cc | no-og-tag | 2 |
| mindsdb | https://info.mindsdb.com | no-og-tag | 2 |
| coverler | https://coverler.com/ai-cover-letter-generator | no-og-tag | 2 |
| chatmind | https://home.chatmind.tech | no-og-tag | 2 |
| chatgpt exporter | https://www.chatgptexporter.com/en/docs/quick-start | no-og-tag | 2 |
| cleanvoice ai | https://cleanvoice.ai | no-og-tag | 2 |
| clips ai | https://www.clipsai.com | no-og-tag | 2 |
| chattydocs | https://chattydocs.com | no-og-tag | 2 |
| clearword | https://clearword.com | no-og-tag | 2 |
| code genius | https://codegenius.org | no-og-tag | 2 |
| clonedub | https://www.clonedub.com | no-og-tag | 2 |
| deepbrain ai | https://account.deepbrain.io/auth/signin | no-og-tag | 2 |
| creative fast aid | http://www.creativefastaid.com | no-og-tag | 2 |
| deepreview | https://deepreview.cloud | no-og-tag | 2 |
| deepfakes lol | https://deepfakes.lol | no-og-tag | 2 |
| designify | https://designify.cc | no-og-tag | 2 |
| discuroai | https://discuro.com | no-og-tag | 2 |
| doodle morph ai | https://doodlemorphai.com | no-og-tag | 2 |
| formularizer | https://formularizer.com/home?new=true | no-og-tag | 2 |
| getfloorplan | https://getfloorplan.com | no-og-tag | 2 |
| ghostcut | https://ghostcut.app | no-og-tag | 2 |
| fakeface | https://fakeface.io | no-og-tag | 2 |
| gnbly | https://gnbly.com | no-og-tag | 2 |
| glambase | https://glambase.app/ai-agents | no-og-tag | 2 |
| gobii | https://gobii.ai | no-og-tag | 2 |
| prometai | https://prometai.app | no-og-tag | 2 |
| promptperfect | http://promptperfect.xyz | no-og-tag | 2 |
| designs ai | https://designs.ai | no-og-tag | 2 |
| replicastudios | https://www.replicastudios.com | no-og-tag | 2 |
| proddy io | https://proddy.io/auth/signin | no-og-tag | 2 |
| prophotos | https://prophotos.ai | no-og-tag | 2 |
| respell | https://respell.ai | no-og-tag | 2 |
| potis ai | https://www.potis.ai | no-og-tag | 2 |
| rhetorai | https://www.rhetorai.com | no-og-tag | 2 |
| seo ai | https://seo.ai | no-og-tag | 2 |
| schemawriter ai | https://schemawriter.ai | no-og-tag | 2 |
| shuffll | https://shuffll.com | no-og-tag | 2 |
| resumecheck net | https://resumecheck.net | no-og-tag | 2 |
| social comments gpt | https://social-comments-gpt.com | no-og-tag | 2 |
| socratic by google | https://app.learnwithsocratic.com/welcome.html | no-og-tag | 2 |
| snack prompt | https://snackprompt.com | no-og-tag | 2 |
| spiritme | https://updates.spiritme.tech | no-og-tag | 2 |
| taleai | https://www.taleai.com/en | no-og-tag | 2 |
| steosvoice | https://cybervoice.io/en | no-og-tag | 2 |
| tilemaker | https://tilemaker.org | no-og-tag | 2 |
| topaz video ai | https://topazvideo.cn | no-og-tag | 2 |
| voila | https://voila.ca | no-og-tag | 2 |
| voicemaker | https://voicemaker.in | no-og-tag | 2 |
| wowto | https://wowto.ai | no-og-tag | 2 |
| vsub | https://vsub.io | no-og-tag | 2 |
| codegeex | https://codegeex.cn | no-og-tag | 3 |
| writegpt | https://writegptapp.com | no-og-tag | 2 |
| etsygenerator | https://etsygenerator.com | no-og-tag | 3 |
| rose ai | https://rose.ai | no-og-tag | 3 |
| aicheatcheck | https://aicheatcheck.com | no-og-tag | 2 |
| waverly | https://waverly.com/home | no-og-tag | 2 |
| ai writer | https://www.hyperwriteai.com/tools/free-ai-writer | no-og-tag | 2 |
| applai me | https://www.applai.me | no-og-tag | 2 |
| arcwise ai | https://arcwise.app | no-og-tag | 2 |
| adcopy ai | https://app.adcopy.ai | no-og-tag | 2 |
| aiva | https://www.aiva.ai | no-og-tag | 2 |
| autoresponder ai | https://www.autoresponder.ai | no-og-tag | 2 |
| bhuman | https://www.bhuman.ai | no-og-tag | 2 |
| belva | https://www.belva.com | no-og-tag | 2 |
| answerflow ai | https://www.answerflow-ai.com | no-og-tag | 2 |
| call annie | https://callannie.ai | no-og-tag | 2 |

### 组2：页面抓取失败（129 条）——被墙/超时/下线

| name | url | 失败详情 | 来源目录页数 |
|---|---|---|---|
| vimeo ai | https://vimeo.com/features/vimeo-ai | fetch-fail(fetch failed) | 2 |
| namy ai | https://namy.ai | fetch-fail(fetch failed) | 2 |
| norby ai | https://norby.io | fetch-fail(Failed to parse URL from images/thumbnai) | 2 |
| ifoto | https://www.ifoto.ai | fetch-fail(fetch failed) | 2 |
| jan | https://www.jan.ai | fetch-fail(fetch failed) | 2 |
| keywrds ai | https://keywrds.ai | fetch-fail(The operation was aborted due to timeout) | 2 |
| notebooklm | https://notebooklm.google | fetch-fail(fetch failed) | 2 |
| monic ai | https://monica.im | fetch-fail(fetch failed) | 2 |
| novelai | https://novelai.net | fetch-fail(fetch failed) | 2 |
| photoroom | https://www.photoroom.com | fetch-fail(fetch failed) | 2 |
| meshy | https://www.meshy.ai | fetch-fail(fetch failed) | 3 |
| pika | https://pika.art | fetch-fail(fetch failed) | 2 |
| artbreeder | https://artbreeder.com | fetch-fail(fetch failed) | 2 |
| chat2course | https://chat2course.com | fetch-fail(fetch failed) | 2 |
| chatdoc | https://chatdoc.com | fetch-fail(fetch failed) | 2 |
| chronicle | https://chronline.com | fetch-fail(Failed to parse URL from                ) | 2 |
| accountabilabuddy | https://www.urbandictionary.com/define.php?term=accountabilibuddy | fetch-fail(fetch failed) | 2 |
| writesonic | https://writesonic.com | fetch-fail(fetch failed) | 3 |
| pixlr | https://pixlr.com | fetch-fail(fetch failed) | 3 |
| ai gallery | https://aigallery.app | fetch-fail(fetch failed) | 2 |
| coverposts | https://coverposts.com | fetch-fail(fetch failed) | 2 |
| artsmart ai | https://artsmart.ai | fetch-fail(fetch failed) | 2 |
| chatpdf | https://www.chatpdf.com | fetch-fail(fetch failed) | 2 |
| clipdrop | https://clipdrop.co | fetch-fail(fetch failed) | 2 |
| hot reach ai | https://hotreachai.com | fetch-fail(fetch failed) | 2 |
| clipfly | https://www.clipfly.ai | fetch-fail(fetch failed) | 2 |
| eightify | https://eightify.app | fetch-fail(fetch failed) | 2 |
| longshot ai | https://www.longshot.ai | fetch-fail(Failed to parse URL from Long%20Shot%201) | 2 |
| magicslides | https://www.magicslides.app | fetch-fail(fetch failed) | 2 |
| google ai studio | https://aistudio.google.com | fetch-fail(fetch failed) | 2 |
| gencraft | https://gencraft.com | fetch-fail(fetch failed) | 2 |
| doctrina ai | https://www.aitoolsspace.com/en/tools/doctrina-ai | fetch-fail(The operation was aborted due to timeout) | 2 |
| grok | https://grok.com | fetch-fail(fetch failed) | 2 |
| ideogram | https://ideogram.ai | fetch-fail(fetch failed) | 2 |
| muse pro | https://www.musepro.app | fetch-fail(fetch failed) | 2 |
| playarti | https://playarti.com | fetch-fail(fetch failed) | 2 |
| podsift | https://www.podsift.com | fetch-fail(fetch failed) | 2 |
| krea | https://www.krea.ai | fetch-fail(fetch failed) | 2 |
| luma ai | https://lumalabs.ai | fetch-fail(fetch failed) | 2 |
| rankpress io | https://rankpress.io | fetch-fail(fetch failed) | 2 |
| meta ai | https://www.meta.ai | fetch-fail(fetch failed) | 2 |
| moltbook | https://www.moltbook.com | fetch-fail(fetch failed) | 2 |
| sellerai | https://sellerai.com | fetch-fail(fetch failed) | 2 |
| roll | https://roll20.net | fetch-fail(Failed to parse URL from images/roll20-h) | 2 |
| sofabrain | https://sofabrain.com | fetch-fail(fetch failed) | 2 |
| morise ai | https://easywithai.com/ai-video-tools/morise-ai | fetch-fail(fetch failed) | 2 |
| nichesss | https://nichesss.com | fetch-fail(The operation was aborted due to timeout) | 2 |
| pixite | https://support.pixiteapps.com/hc/zh-cn | fetch-fail(fetch failed) | 2 |
| translate video | https://anytranscribe.com/core-tools/audio-video-translator | fetch-fail(fetch failed) | 2 |
| poe | https://poe.com | fetch-fail(fetch failed) | 2 |
| reflectr | https://www.reflectr.ai | fetch-fail(The operation was aborted due to timeout) | 2 |
| scite | https://scite.ai | fetch-fail(fetch failed) | 2 |
| teachable machine | https://teachablemachine.withgoogle.com | fetch-fail(fetch failed) | 2 |
| you | https://you.com | fetch-fail(fetch failed) | 2 |
| wiseone | https://www.wiseoneuk.com | fetch-fail(fetch failed) | 2 |
| superflows | https://www.superflows.ai | fetch-fail(Failed to parse URL from superflows-dark) | 3 |
| one ai | https://oneai.media/login | fetch-fail(fetch failed) | 2 |
| obviously ai | https://obviously.ai | fetch-fail(The operation was aborted due to timeout) | 2 |
| insight7 | https://insight7.io | fetch-fail(fetch failed) | 3 |
| audioshake | https://www.audioshake.ai | fetch-fail(The operation was aborted due to timeout) | 3 |
| any summary | https://www.anysummary.app | fetch-fail(fetch failed) | 2 |
| character ai | https://character.ai | fetch-fail(fetch failed) | 3 |
| perplexity ai | https://www.perplexity.ai | fetch-fail(fetch failed) | 3 |
| invideo | https://invideo.io | fetch-fail(fetch failed) | 3 |
| heygen | https://www.heygen.com | fetch-fail(fetch failed) | 3 |
| tripo ai | https://www.tripo3d.ai | fetch-fail(fetch failed) | 3 |
| trickle | https://trickle.so | fetch-fail(fetch failed) | 3 |
| playground ai | https://playgroundai.com | fetch-fail(fetch failed) | 3 |
| suno | https://suno.com/l/ai-music-app | fetch-fail(fetch failed) | 3 |
| anime ai | https://perchance.org/ai-anime-generator | fetch-fail(fetch failed) | 2 |
| blaze | https://www.theblaze.com | fetch-fail(fetch failed) | 2 |
| echowin | https://echo.win | fetch-fail(fetch failed) | 2 |
| heyphoto | https://hey-photo.com | fetch-fail(fetch failed) | 2 |
| chatgot | https://chatgpt.com | fetch-fail(fetch failed) | 2 |
| deep dream generator | https://deepdreamgenerator.com | fetch-fail(fetch failed) | 2 |
| gpt researcher | https://chatgpt.com/g/g-nRK3Nn5yE-researcher | fetch-fail(fetch failed) | 2 |
| hypotenuse ai | https://www.hypotenuse.ai | fetch-fail(fetch failed) | 2 |
| dezgo | https://dezgo.com | fetch-fail(fetch failed) | 2 |
| atlas | https://www.worldatlas.com | fetch-fail(fetch failed) | 2 |
| microsoft copilot | https://copilot.microsoft.com | fetch-fail(fetch failed) | 2 |
| imagine me | https://imagineme.ai | fetch-fail(fetch failed) | 2 |
| jounce | https://jounce.ai | fetch-fail(fetch failed) | 2 |
| ordinary people prompts | https://www.ordinarypeopleprompts.com/howto | fetch-fail(fetch failed) | 2 |
| lexica | https://lexica.art/login | fetch-fail(fetch failed) | 2 |
| magickpen | https://magickpen.com | fetch-fail(fetch failed) | 2 |
| nightcafe studio | https://creator.nightcafe.studio | fetch-fail(fetch failed) | 2 |
| openart | https://openart.ai | fetch-fail(fetch failed) | 2 |
| tldr this | https://www.tldrthis.com | fetch-fail(fetch failed) | 2 |
| picsart | https://picsart.com | fetch-fail(fetch failed) | 2 |
| podcast | https://open.spotify.com/genre/podcasts-page | fetch-fail(fetch failed) | 2 |
| platoria | https://platoria.com | fetch-fail(The operation was aborted due to timeout) | 2 |
| prompthero | https://prompthero.com | fetch-fail(fetch failed) | 2 |
| sider | https://sider.ai | fetch-fail(fetch failed) | 2 |
| steamship | https://www.steamshipauthority.com | fetch-fail(fetch failed) | 2 |
| summarize tech | https://easywithai.com/ai-productivity-tools/summarize-tech | fetch-fail(fetch failed) | 2 |
| virtual staging ai | https://www.virtualstagingai.app | fetch-fail(The operation was aborted due to timeout) | 2 |
| leonardo ai | https://leonardo.ai | fetch-fail(fetch failed) | 2 |
| wirestock | https://wirestock.io | fetch-fail(fetch failed) | 2 |
| chaingpt | https://www.chaingpt.org | fetch-fail(fetch failed) | 2 |
| chat prompt genius | https://chatpromptgenius.com | fetch-fail(fetch failed) | 2 |
| facetune | https://www.facetuneapp.com | fetch-fail(fetch failed) | 2 |
| chatgpt buddy | https://chatgpt.com/g/g-xGT2QvWZv-pod-buddy | fetch-fail(fetch failed) | 2 |
| chatgpt writer | https://chatgpt.com/writing | fetch-fail(fetch failed) | 2 |
| cutout pro | https://www.cutout.pro | fetch-fail(fetch failed) | 2 |
| replika | https://replika.com | fetch-fail(fetch failed) | 2 |
| generated photos | https://generated.photos | fetch-fail(fetch failed) | 2 |
| genei | https://gemini.genai.mil | fetch-fail(fetch failed) | 2 |
| prompt hunt | https://www.prompthunt.com | fetch-fail(fetch failed) | 2 |
| twine | https://twinery.org | fetch-fail(fetch failed) | 2 |
| udio | https://www.udio.com | fetch-fail(fetch failed) | 2 |
| remini | https://remini.ai | fetch-fail(The operation was aborted due to timeout) | 2 |
| videoleap | https://www.videoleapapp.com | fetch-fail(fetch failed) | 2 |
| songburst | https://www.songburst.ai | fetch-fail(The operation was aborted due to timeout) | 2 |
| stablecog | https://stablecog.com | fetch-fail(fetch failed) | 2 |
| sketch2app | https://sketch2app.io | fetch-fail(The operation was aborted due to timeout) | 2 |
| teach anything | https://www.teach-anything.com | fetch-fail(fetch failed) | 2 |
| trainengine ai | https://trainengine.ai | fetch-fail(fetch failed) | 2 |
| unsummary | https://easywithai.com/ai-productivity-tools/unsummary | fetch-fail(fetch failed) | 2 |
| scribble diffusion | https://scribblediffusion.net | fetch-fail(Failed to parse URL from URL OF IMAGE) | 3 |
| thumbmachine | https://thumbmachine.com | fetch-fail(The operation was aborted due to timeout) | 2 |
| applaime | https://applaime.com/?ref=saasaitools | fetch-fail(fetch failed) | 2 |
| ai suggests | https://www.ai-suggests.com | fetch-fail(Failed to parse URL from assets/img/soci) | 2 |
| claude | https://claude.com | fetch-fail(fetch failed) | 3 |
| youmind | https://youmind.com | fetch-fail(fetch failed) | 2 |
| civitai | https://civitai.com | fetch-fail(fetch failed) | 3 |
| typeface | https://www.typeface.ai | fetch-fail(fetch failed) | 3 |
| vidiq | https://vidiq.com | fetch-fail(fetch failed) | 3 |
| craiyon | https://www.craiyon.com | fetch-fail(fetch failed) | 3 |
| blackbox ai | https://www.blackbox.ai | fetch-fail(fetch failed) | 2 |

### 组3：页面错误状态（81 条）——4xx/5xx/挑战页

| name | url | 失败详情 | 来源目录页数 |
|---|---|---|---|
| godmode | https://www.lifewire.com/god-mode-windows-4154662 | page-403 | 2 |
| makelog | https://topai.tools/t/makelog | page-403 | 2 |
| mango ai | https://mangoanimate.com | page-403 | 2 |
| jetpack ai assistant | https://ai.jetpacksandbox.com/assistant | page-500 | 2 |
| komo search | https://theresanaiforthat.com/ai/komo-ai | page-403 | 3 |
| mymap ai | https://www.mymap.ai | page-403 | 3 |
| sibyl ai | https://sibyls.ai | page-403 | 3 |
| stable audio | https://stableaudio.com/generate | page-403 | 3 |
| 88stacks | https://88stacks.com/models/tag--art | page-403 | 2 |
| adept | https://www.merriam-webster.com/dictionary/adept | page-403 | 2 |
| ai consulting tools | https://thedigitalprojectmanager.com/tools/best-ai-tools-for-consultants | page-403 | 2 |
| aitubo | https://aitubo.ai | page-403 | 2 |
| arc search | https://arc.net/search | page-403 | 2 |
| assisterr | https://build.assisterr.ai | page-307 | 2 |
| architectgpt | https://www.architectgpt.io | page-403 | 2 |
| charisma | https://www.merriam-webster.com/dictionary/charisma | page-403 | 2 |
| chartpixel | https://www.chartpixel.com | page-403 | 2 |
| chatdesigner | https://creati.ai/ai-tools/chatdesigner | page-403 | 2 |
| chattab | https://theresanaiforthat.com/ai/chattab | page-403 | 2 |
| create | https://www.curseforge.com/minecraft/mc-mods/create | page-403 | 2 |
| dream interpreter | https://dreaminterpreter.ai | page-429 | 2 |
| doo | https://www.doordash.com | page-403 | 2 |
| hidden door | https://hiddendoorstore.com | page-503 | 2 |
| julius | https://julius.ai | page-403 | 2 |
| makemytale | https://www.makemytale.com | page-502 | 2 |
| perso ai | https://perso.ai | page-403 | 2 |
| prepai | https://www.prepai.io/us | page-403 | 2 |
| promo ai | https://www.promeai.pro | page-403 | 2 |
| questflow | https://questflow.ai | page-403 | 2 |
| rejoy | https://rejoy.hu | page-403 | 2 |
| stylar | https://app.stylar.com | page-402 | 2 |
| three sigma | https://www.investopedia.com/terms/t/three-sigma-limits.asp | page-403 | 2 |
| thumbnailai | https://thumbnail.ai | page-403 | 2 |
| tripadvisor summary | https://www.tripadvisor.com | page-403 | 2 |
| tweetify it | https://tweetify.it | page-403 | 2 |
| viggle | https://viggle.ai | page-403 | 2 |
| vocal remover | https://vocalremover.org | page-403 | 2 |
| marketingblocks ai | https://www.marketingblocks.ai | page-403 | 2 |
| upword | https://www.upwork.com | page-403 | 2 |
| lucidpic | https://lucidpic.com | page-403 | 3 |
| looka | https://looka.com | page-403 | 3 |
| 3daily | https://3daily.ai | page-403 | 2 |
| canva | https://www.canva.com | page-403 | 2 |
| danelfin | https://danelfin.com | page-403 | 2 |
| gpt engineer | https://levelup.gitconnected.com/gpt-engineer-build-an-entire-app-with-a-single-prompt-14a1bbf4aeb6 | page-403 | 2 |
| gptgo | https://gptgo.ai/pages/about.html | page-403 | 2 |
| hourone | https://www.beyond-the-ai.com/tools/hourone | page-403 | 2 |
| inmagic ai | https://inmagic.ai | page-403 | 2 |
| jogg ai | https://www.jogg.ai | page-403 | 2 |
| levity | https://www.merriam-webster.com/dictionary/levity | page-403 | 2 |
| lovo ai | https://lovo.ai | page-402 | 2 |
| lovable | https://lovable.dev | page-403 | 2 |
| maverick | https://maverik.com | page-403 | 2 |
| openread | https://www.openread.academy | page-429 | 2 |
| quino | https://www.healthline.com/nutrition/what-is-quinoa | page-403 | 2 |
| reply io | https://reply.io | page-403 | 2 |
| screenapp | https://creati.ai/ai-tools/screenapp | page-403 | 2 |
| scholarcy | https://www.scholarcy.com | page-403 | 2 |
| shownotes | https://www.shownotes.io | page-403 | 2 |
| sierra | https://www.sierra.com/home/index | page-403 | 2 |
| team gpt | https://app.team-gpt.com | page-403 | 2 |
| theb ai | https://creati.ai/ai-tools/theb-ai | page-403 | 2 |
| turbosite | https://topai.tools/t/turbosite | page-403 | 2 |
| vacay | https://esim.vacay.asia/th/en | page-403 | 2 |
| youware | https://www.youware.com | page-403 | 2 |
| zenen ai | https://zenen.ai/?ref=deepgram | page-526 | 2 |
| cold mail bot | https://quillbot.com/ai-writing-tools/ai-cold-email-generator | page-403 | 2 |
| consensus | https://consensus.app | page-403 | 2 |
| genspark ai | https://www.genspark.ai | page-403 | 2 |
| refraction | https://www.britannica.com/science/refraction | page-403 | 2 |
| samurai | https://www.britannica.com/topic/samurai | page-403 | 2 |
| scribble ai | https://www.scribbr.com/ai-detector | page-403 | 2 |
| textcortex ai | https://textcortex.com | page-403 | 2 |
| toucan | https://www.britannica.com/animal/toucan | page-403 | 2 |
| transvribe | https://www.transcribe.gov.sg | page-403 | 2 |
| midjourney | https://www.midjourney.com | page-403 | 4 |
| quizgecko | https://quizgecko.com | page-403 | 3 |
| unriddle | https://www.beyond-the-ai.com/tools/unriddle | page-403 | 3 |
| 60sec site | https://60sec.site | page-403 | 2 |
| activecampaign ai | https://www.activecampaign.com/platform/artificial-intelligence | page-403 | 2 |
| blackink ai | https://blackink.ai | page-403 | 2 |

### 组4：og:image 已失效（28 条）

| name | url | 失败详情 | 来源目录页数 |
|---|---|---|---|
| happyml | https://docs.happyml.com/introduction | ogimg-400 | 2 |
| imean ai | https://www.imean.ai | ogimg-404 | 2 |
| lovegenius | https://www.lovegenius.io | ogimg-404 | 2 |
| listnr | https://www.listnr.com | ogimg-400 | 3 |
| berri ai | https://docs.berri.ai/introduction | ogimg-400 | 2 |
| brainstory | https://www.albertafamilywellness.org/training | ogimg-404 | 2 |
| codemate | https://codemate.ai | ogimg-404 | 2 |
| coinfeeds | https://www.coinfeeds.ai | ogimg-404 | 2 |
| imagetocartoon | https://imagetocartoon.com | ogimg-404 | 2 |
| keywords ai | https://test.keywordsai.co | ogimg-403 | 2 |
| excel formula bot | https://www.formulabot.com/excel-ai | ogimg-502 | 2 |
| promptloop | https://www.promptloop.com | ogimg-403 | 2 |
| thoughtly | https://thoughtly.com | ogimg-400 | 2 |
| texts from my ex | https://textsfrommyex.com | ogimg-403 | 2 |
| krikey ai | https://www.krikey.ai | ogimg-403 | 2 |
| mapdeduce | https://matseotools.com/ai/mapdeduce | ogimg-404 | 2 |
| ourbabyai | https://ourbabyai.com | ogimg-404 | 2 |
| prompter | https://cueprompter.com | ogimg-404 | 2 |
| runday | https://www.runday.ai | ogimg-404 | 2 |
| wizychat | https://wizy.chat/pricing | ogimg-404 | 2 |
| keep it shot | https://keepitshot.com | ogimg-404 | 2 |
| chat2csv | https://chat2csv.com | ogimg-404 | 2 |
| deep realms | https://www.deeprealms.io | ogimg-404 | 2 |
| draw3d | https://draw3d.online | ogimg-404 | 2 |
| roamaround | https://roamaround.app | ogimg-401 | 2 |
| teddy ai | https://www.teddyai.com | ogimg-400 | 2 |
| copymonkey | https://copymonkey.ai | ogimg-404 | 2 |
| backlinkgpt | https://backlinkgpt.com/en | ogimg-404 | 2 |

### 组5：og:image 类型不收（15 条）

| name | url | 失败详情 | 来源目录页数 |
|---|---|---|---|
| agenthub | https://agenthub.digital | ogimg-badtype(text/html) | 2 |
| ai2image | https://www.ai2image.com | ogimg-badtype(text/html) | 2 |
| gptbots ai | https://www.gptbots.ai | ogimg-badtype(binary/octet-stream) | 2 |
| majorgen | https://majorgen.com | ogimg-badtype(image/svg+xml) | 2 |
| perfectessaywriterai | https://www.perfectessaywriter.ai | ogimg-badtype(image/svg+xml) | 2 |
| vidon ai | https://vidon.ai | ogimg-badtype(image/svg+xml) | 2 |
| vertech academy | https://www.vertechacademy.com | ogimg-badtype(text/html) | 2 |
| zerothreat | https://zerothreat.ai | ogimg-badtype(image/svg+xml) | 2 |
| novelistai | https://novelistai.com | ogimg-badtype() | 2 |
| beam | https://shopbeam.com | ogimg-badtype(image/svg+xml) | 2 |
| creativai | https://www.creativai.ai/?lang=en | ogimg-badtype(image/svg+xml) | 2 |
| hexus | https://www.hexus.ai | ogimg-badtype(image/svg+xml) | 2 |
| roketfy | https://roketfy.com | ogimg-badtype() | 2 |
| rebeccai | https://rebecc.ai | ogimg-badtype(image/svg+xml) | 2 |
| tldr bot | https://tldrbot.ai | ogimg-badtype(text/html) | 2 |

### 组6：偶发失败可重试（25 条）——现在实测正常

| name | url | 失败详情 | 来源目录页数 |
|---|---|---|---|
| copilot2trip | https://copilot2trip.com | ogimg-ok(missed-at-import) | 2 |
| copilot | http://copilot.com | ogimg-ok(missed-at-import) | 2 |
| legaliser | https://www.legaliser.com | ogimg-ok(missed-at-import) | 2 |
| magic eraser | https://magiceraser.org | ogimg-ok(missed-at-import) | 2 |
| linguix | https://linguix.com | ogimg-ok(missed-at-import) | 2 |
| mindygem | https://www.mindygem.com | ogimg-ok(missed-at-import) | 2 |
| resume worded | https://resumeworded.com | ogimg-ok(missed-at-import) | 2 |
| ready to send | https://www.readytosend.com | ogimg-ok(missed-at-import) | 2 |
| todo is | https://www.todoist.com | ogimg-ok(missed-at-import) | 2 |
| vellum | https://vellum.pub | ogimg-ok(missed-at-import) | 2 |
| voxxio | https://oxad.ai/voxxio | ogimg-ok(missed-at-import) | 2 |
| microsoft designer | https://microsoft.design/articles/ai-powered-creativity-with-microsoft-designer | ogimg-ok(missed-at-import) | 2 |
| magnific ai | https://www.magnific.com | ogimg-ok(missed-at-import) | 3 |
| promptbase | https://promptbase.com | ogimg-ok(missed-at-import) | 3 |
| replit | https://replit.com | ogimg-ok(missed-at-import) | 3 |
| fadr | https://fadr.com | ogimg-ok(missed-at-import) | 2 |
| gemoo | https://aitools.aiting.com/ai/gemoo | ogimg-ok(missed-at-import) | 2 |
| n8n | https://n8n.io | ogimg-ok(missed-at-import) | 2 |
| sonara | https://www.sonara.ai | ogimg-ok(missed-at-import) | 2 |
| dr lambda | https://theaitoolsbox.com/tool/dr-lambda-review | ogimg-ok(missed-at-import) | 2 |
| ramblefix | https://ramblefix.com | ogimg-ok(missed-at-import) | 2 |
| venturusai | https://venturusai.com | ogimg-ok(missed-at-import) | 2 |
| visla | https://www.visla.us | ogimg-ok(missed-at-import) | 2 |
| wand ai | https://wand.ai | ogimg-ok(missed-at-import) | 2 |
| briefy | https://briefy.ai | ogimg-ok(missed-at-import) | 2 |

## 六、来源目录页取图方案

冷启动清单来自 4 个主流 AI 目录站，其条目详情页均展示工具截图/logo：

| 来源目录 | 条目页 URL 规律 | 图片 |
|---|---|---|
| futurepedia.io | /tool/{slug} | 截图 + logo |
| futuretools.io | /tools/{slug} | logo/截图 |
| theresanaiforthat.com | /ai/{slug} | 截图 + logo |
| toolify.ai | /tool/{slug} | 截图 + logo |

取图路径：对每条缺图 item，从「来源目录页」字段拿到条目页 URL → 抓取页面 → 提取 og:image 或 img.lg 对象 → 上传 Sanity。优点：目录站可达性好（不被墙）、图片已是 16:9 适配尺寸、工具名与截图严格对应（无张冠李戴风险）。1144 条中 1112 条有来源目录页记录（97%）。

## 附：数据文件

- 分组明细（机器可读）：scripts/tmp-noimage-groups.json
- 根因逐条：scripts/tmp-noimage-reasons.json
- 来源目录页索引：scripts/tmp-source-pages.json
