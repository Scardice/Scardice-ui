<template>
  <section class="workspace-page about-workspace" aria-labelledby="about-workspace-title">
    <header class="workspace-header">
      <div>
        <h1 id="about-workspace-title" class="workspace-title">关于</h1>
        <p class="workspace-subtitle">版本信息、项目链接与致谢名单。</p>
      </div>
    </header>

    <div class="workspace-body workspace-scroll">
      <section class="workspace-panel about-intro" aria-label="版本与链接">
        <img class="about-logo" :src="imgHaibao" alt="Scardice 吉祥物" />
        <div class="about-info">
          <p class="about-lead">
            Scardice UI 是配合 Scardice-core
            使用的管理前端。本地实现会在遵守相应许可的前提下参考上游开源项目，具体信息以对应仓库为准。
          </p>
          <dl class="about-facts">
            <div>
              <dt>当前版本</dt>
              <dd>{{ store.curDice.baseInfo.version || '未知' }}</dd>
            </div>
            <div>
              <dt>项目主页</dt>
              <dd>
                <el-link
                  type="primary"
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://github.com/Scardice/Scardice-core"
                  >github.com/Scardice/Scardice-core</el-link
                >
              </dd>
            </div>
            <div>
              <dt>使用手册</dt>
              <dd>
                <el-link
                  type="primary"
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://dice.weizaima.com/manual/"
                  >dice.weizaima.com/manual</el-link
                >
              </dd>
            </div>
            <div>
              <dt>投喂余烬</dt>
              <dd class="about-muted">暂未开放</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="workspace-panel about" aria-labelledby="about-thanks-title">
        <div class="workspace-panel-header">
          <div>
            <h2 id="about-thanks-title">致谢 ♪(･ω･)ﾉ</h2>
            <p>感谢参与测试、反馈问题、帮助完善指令的各位（排名不分先后）。</p>
          </div>
        </div>

        <div class="subtitle">V1.6 版本</div>
        <div class="developers">
          <el-link
            v-for="contributor in v16Contributors"
            :key="contributor.github"
            :class="{
              'developer-muted':
                contributor.github === 'PaienNate' && contributor.name !== 'PaienNate',
            }"
            :underline="false"
            :href="`https://github.com/${contributor.github}`"
            target="_blank"
            rel="noopener noreferrer">
            <el-avatar
              shape="circle"
              :size="50"
              :src="`${urlBase}/sd-api/utils/ga/${contributor.github}`" />
            {{ contributor.name }}
          </el-link>
        </div>

        <div class="subtitle">V1.5 版本</div>
        <div class="developers">
          <el-link :underline="false" href="https://github.com/fy0" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/fy0'" />木落</el-link
          >
          <el-link :underline="false" href="https://github.com/PaienNate" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/PaienNate'" />PaienNate</el-link
          >
          <el-link :underline="false" href="https://github.com/Fripine" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Fripine'" />Fripine</el-link
          >
          <el-link :underline="false" href="https://github.com/JustAnotherID" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              style="border: 1px solid #aaa"
              :src="urlBase + '/sd-api/utils/ga/JustAnotherID'" />只是另一个ID</el-link
          >
          <el-link :underline="false" href="https://github.com/MintCider" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/MintCider'" />Mint Cider</el-link
          >
          <el-link :underline="false" href="https://github.com/MX-fox" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/MX-fox'" />暮星</el-link
          >
          <el-link :underline="false" href="https://github.com/Xiangze-Li" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Xiangze-Li'" />JohNSoN</el-link
          >
          <el-link :underline="false" href="https://github.com/bugtower100" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/bugtower100'" />Bugtower100</el-link
          >
          <el-link :underline="false" href="https://github.com/charyflys" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/charyflys'" />希望潇洒的风：Ceeling (UI)</el-link
          >
          <el-link :underline="false" href="https://github.com/Szzrain" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Szzrain'" />Szzrain</el-link
          >
          <el-link :underline="false" href="https://github.com/asterson" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/asterson'" />冬子(UI)</el-link
          >
          <el-link :underline="false" href="https://github.com/GUERdugujian" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/GUERdugujian'" />咕之勇者独孤剑(dnd5文档)</el-link
          >
          <el-link :underline="false" href="https://github.com/oissevalt" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/oissevalt'" />檀轶步棋</el-link
          >
          <el-link :underline="false" href="https://github.com/kenichiLyon" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              src="https://d1.sealdice.com/images/kenichiLyon.jpg" />山本健一</el-link
          >
          <el-link :underline="false" href="https://github.com/error2913" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/error2913'" />error2913</el-link
          >
          <el-link :underline="false" href="https://github.com/baiyu-yu" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/baiyu-yu'" />白鱼</el-link
          >
          <el-link :underline="false" href="https://github.com/FairyOwO" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/FairyOwO'" />FairyOwO</el-link
          >
          <el-link :underline="false" href="https://github.com/conglinyizhi" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/conglinyizhi'" />丛林意志(UI)</el-link
          >
          <el-link :underline="false" href="https://github.com/yichere" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/yichere'" />炽热</el-link
          >
        </div>
        <div style="margin-top: 2rem" class="subtitle">V1.5.0 特别致谢</div>
        <div class="developers">
          <!-- <img  referrerpolicy="no-referrer"  src="https://avatars.githubusercontent.com/u/54656633?v=4&a=1" /> -->
          <el-link :underline="false" href="https://github.com/LoranaAurelia" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/LoranaAurelia'" />雪桃 - 提供新的魔法阵代理</el-link
          >
          <el-link
            :underline="false"
            href="https://dice.weizaima.com/public-dice"
            target="_blank"
            style="color: var(--el-link-text-color); transition: color 3s"
            onmouseover="this.style.color = 'red'"
            onmouseout="this.style.color = 'var(--el-link-text-color)'"
            ><el-avatar
              shape="circle"
              :size="50"
              src="https://d1.sealdice.com/images/bird.jpg" />[骰]诺扣提 - 公骰 (协助测试)</el-link
          >

          <el-link :underline="false" href="https://github.com/kenichiLyon" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              src="https://d1.sealdice.com/images/kenichiLyon.jpg" />山本健一 - 协助测试</el-link
          >

          <el-link :underline="false" href="https://github.com/baiyu-yu" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/baiyu-yu'" />白鱼 - 协助测试</el-link
          >

          <el-link :underline="false" href="#/about" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              src="https://firehomework.top/img/6819CBB71F64D7BBFC90DCF4432B76BC.jpg" />[骰]Gaza(3658887052)
            - 协助测试</el-link
          >
        </div>

        <div style="margin-top: 2rem" class="subtitle">V1.4 版本</div>
        <div class="developers">
          <!-- <img  referrerpolicy="no-referrer"  src="https://avatars.githubusercontent.com/u/54656633?v=4&a=1" /> -->
          <el-link :underline="false" href="https://github.com/JustAnotherID" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              style="border: 1px solid #aaa"
              :src="urlBase + '/sd-api/utils/ga/JustAnotherID'" />只是另一个ID</el-link
          >
          <el-link :underline="false" href="https://github.com/Szzrain" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Szzrain'" />Szzrain</el-link
          >
          <el-link :underline="false" href="https://github.com/Xiangze-Li" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Xiangze-Li'" />JohNSoN</el-link
          >
          <el-link :underline="false" href="https://github.com/oissevalt" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/oissevalt'" />檀轶步棋</el-link
          >
          <el-link :underline="false" href="https://github.com/FlameTEXT" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/FlameTEXT'" />脑</el-link
          >
          <el-link :underline="false" href="https://github.com/fy0" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/fy0'" />木落</el-link
          >
          <el-link :underline="false" href="https://github.com/Director259" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Director259'" />Director259</el-link
          >
          <el-link :underline="false" href="https://github.com/VolEurr0Se" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/VolEurr0Se'" />浣熊旅記(dnd5文档)</el-link
          >
          <el-link :underline="false" href="https://github.com/zeroxilo" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/zeroxilo'" />调零(dnd5文档)</el-link
          >
          <el-link :underline="false" href="https://github.com/cherrybird7" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/cherrybird7'" />凤吹风雪(7版怪锤)</el-link
          >
          <el-link :underline="false" href="javascript:void(0)"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="imgHaibao" />奈亚猫猫汉化组(7版怪锤)</el-link
          >
          <el-link :underline="false" href="javascript:void(0)"
            ><el-avatar shape="circle" :size="50" :src="imgHaibao" />稚鸢音(7版怪锤)</el-link
          >
          <el-link :underline="false" href="https://github.com/Fripine" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Fripine'" />Fripine</el-link
          >
          <el-link :underline="false" href="https://github.com/MintCider" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/MintCider'" />逐风</el-link
          >
          <el-link :underline="false" href="https://github.com/yichere" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/yichere'" />炽热</el-link
          >
          <el-link :underline="false" href="https://github.com/MX-fox" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/MX-fox'" />暮星</el-link
          >
          <el-link :underline="false" href="https://github.com/0018cha" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/0018cha'" />0.018</el-link
          >
          <el-link :underline="false" href="https://github.com/shakugannosaints" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/shakugannosaints'" />冷筱华</el-link
          >
        </div>

        <div style="margin-top: 2rem" class="subtitle">V1.4 安卓端</div>
        <div class="developers">
          <!-- <img  referrerpolicy="no-referrer"  src="https://avatars.githubusercontent.com/u/54656633?v=4&a=1" /> -->
          <el-link :underline="false" href="https://github.com/Szzrain" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Szzrain'" />Szzrain</el-link
          >
          <el-link :underline="false" href="https://github.com/PaienNate" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/PaienNate'" />PaienNate</el-link
          >
          <el-link :underline="false" href="https://github.com/fy0" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/fy0'" />木落</el-link
          >
        </div>

        <div style="margin-top: 2rem" class="subtitle">V1.4.5 特别致谢</div>
        <div class="developers">
          <!-- <img  referrerpolicy="no-referrer"  src="https://avatars.githubusercontent.com/u/54656633?v=4&a=1" /> -->
          <el-link :underline="false" href="https://github.com/Linwenxuan05" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Linwenxuan05'" />Linwenxuan05</el-link
          >
        </div>

        <div style="margin-top: 2rem" class="subtitle">V1.3 版本</div>
        <div class="developers">
          <!-- <img  referrerpolicy="no-referrer"  src="https://avatars.githubusercontent.com/u/54656633?v=4&a=1" /> -->
          <el-link :underline="false" href="https://github.com/JustAnotherID" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              style="border: 1px solid #aaa"
              :src="urlBase + '/sd-api/utils/ga/JustAnotherID'" />只是另一个ID</el-link
          >
          <el-link :underline="false" href="https://github.com/Szzrain" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Szzrain'" />Szzrain</el-link
          >
          <el-link :underline="false" href="https://github.com/Xiangze-Li" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Xiangze-Li'" />JohNSoN</el-link
          >
          <el-link :underline="false" href="https://github.com/oissevalt" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/oissevalt'" />檀轶步棋</el-link
          >
          <el-link :underline="false" href="https://github.com/FlameTEXT" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/FlameTEXT'" />脑</el-link
          >
          <el-link :underline="false" href="https://github.com/fy0" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/fy0'" />木落</el-link
          >
        </div>

        <div style="margin-top: 2rem" class="subtitle">V1.3 安卓端</div>
        <div class="developers">
          <!-- <img  referrerpolicy="no-referrer"  src="https://avatars.githubusercontent.com/u/54656633?v=4&a=1" /> -->
          <el-link :underline="false" href="https://github.com/Szzrain" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Szzrain'" />Szzrain</el-link
          >
          <el-link :underline="false" href="https://github.com/PaienNate" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/PaienNate'" />PaienNate</el-link
          >
        </div>

        <div style="margin-top: 2rem" class="subtitle">V1.2 版本</div>
        <div class="developers">
          <!-- <img  referrerpolicy="no-referrer"  src="https://avatars.githubusercontent.com/u/54656633?v=4&a=1" /> -->
          <el-link :underline="false" href="https://github.com/fy0" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/fy0'" />木落</el-link
          >
          <el-link :underline="false" href="https://github.com/Szzrain" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Szzrain'" />Szzrain</el-link
          >
          <el-link :underline="false" href="https://github.com/yuyannuo" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/yuyannuo'" />于言诺</el-link
          >
          <el-link :underline="false" href="https://github.com/oissevalt" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/oissevalt'" />檀轶步棋</el-link
          >
          <el-link :underline="false" href="https://github.com/FlameTEXT" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/FlameTEXT'" />脑</el-link
          >
          <el-link :underline="false" href="https://github.com/SunnyJoyce" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/SunnyJoyce'" />熊米</el-link
          >
          <el-link :underline="false" href="https://github.com/VolEurr0Se" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/VolEurr0Se'" />浣熊旅記</el-link
          >
          <el-link :underline="false" href="https://github.com/lxy071130" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/lxy071130'" />流溪</el-link
          >
          <el-link :underline="false" href="https://github.com/nodisease" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/nodisease'" />病</el-link
          >
        </div>

        <div style="margin-top: 2rem" class="subtitle">V1.2 安卓端</div>
        <div class="developers">
          <!-- <img  referrerpolicy="no-referrer"  src="https://avatars.githubusercontent.com/u/54656633?v=4&a=1" /> -->
          <el-link :underline="false" href="https://github.com/96368a" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/96368a'" />木末君</el-link
          >
          <el-link :underline="false" href="https://github.com/Szzrain" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Szzrain'" />Szzrain</el-link
          >
          <el-link :underline="false" href="https://github.com/JiYeHuanXiang" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/JiYeHuanXiang'" />极夜幻想</el-link
          >
        </div>

        <div style="margin-top: 2rem" class="subtitle">V1.1 版本</div>
        <div>Szzrain - 实现了Discord和Kook(开黑啦)两个平台的接入</div>
        <div>
          于言诺 -
          制作了很多扩展和牌堆，如养猫、踢海豹、赛博功德、风味月饼、万圣节糖果等等……协助撰写了一些文档和教程，并找出了众多bug
        </div>
        <div>云陌 - 文档教程协力，同时也找了很多bug</div>
        <div>
          <el-link href="https://github.com/kagangtuya-star" target="_blank">星尘</el-link>
          - 编写了同网络登录的教程，友情提供了用于指令参考的fvtt。以及一些建议和bug反馈
        </div>

        <div style="margin-top: 2rem" class="subtitle">V1.0版本</div>
        <div>Ariel船长 - 早期测试参与者，协助解决登录流程问题</div>
        <div>Raycel - 早期测试参与者，协助解决登录流程问题</div>
        <div>kuma - 早期测试参与者，第一次全指令全流程测试</div>
        <div>卟啵 - 早期测试参与者，回报了中文路径和空格路径问题，协助解决了登录流程问题</div>
        <div>蜜瓜包 - 早期测试参与者，默认文档中“怪物之锤查询”的编纂者之一</div>
        <div>
          月森优姬 -
          早期测试参与者，提出了大量各种各样建议和BUG反馈，纠正了一些与规则书不统一的问题，COC同义词和默认技能点数的编纂者
        </div>
        <div>清茶 - 在4月7日的可靠性测试中，参与构造了让旧版海豹进程崩溃的指令</div>
        <div>脑 - 在4月7日的可靠性测试中，参与构造了让旧版海豹进程崩溃的指令</div>
        <div>Greed锦鲤 - 在4月7日的可靠性测试中，参与构造了让旧版海豹进程崩溃的指令</div>
        <div>格莱德 - 在4月7日的可靠性测试中，参与构造了让旧版海豹进程崩溃的指令</div>
        <div>我来逛街 - 提出很多建议；帮助改进了DND5E同义词列表，增加许多常用说法</div>

        <div style="margin-top: 2rem" class="subtitle">手册编写</div>
        <div class="developers">
          <el-link :underline="false" href="https://github.com/JustAnotherID" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              style="border: 1px solid #aaa"
              :src="urlBase + '/sd-api/utils/ga/JustAnotherID'" />只是另一个ID</el-link
          >
          <el-link :underline="false" href="https://github.com/Xiangze-Li" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Xiangze-Li'" />JohNSoN</el-link
          >
          <el-link :underline="false" href="https://github.com/MX-fox" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/MX-fox'" />暮星</el-link
          >
          <el-link :underline="false" href="https://github.com/Szzrain" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Szzrain?v=1'" />Szzrain</el-link
          >
          <el-link :underline="false" href="https://github.com/fy0" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/fy0'" />木落</el-link
          >
          <el-link :underline="false" href="https://github.com/kenichiLyon" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              src="https://d1.sealdice.com/images/kenichiLyon.jpg" />山本健一</el-link
          >
          <el-link :underline="false" href="https://github.com/MintCider" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/MintCider'" />逐风</el-link
          >
          <el-link :underline="false" href="https://github.com/f44r" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/f44r'" />脑</el-link
          >
          <el-link :underline="false" href="https://github.com/bugtower100" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/bugtower100'" />Bugtower</el-link
          >
          <el-link :underline="false" href="https://github.com/Mitxoleta" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Mitxoleta'" />Monad</el-link
          >
          <el-link :underline="false" href="https://github.com/yichirehuijian" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/yichirehuijian'" />以炽热挥剑</el-link
          >
          <el-link :underline="false" href="https://github.com/oissevalt" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/oissevalt'" />檀轶步棋</el-link
          >
          <el-link :underline="false" href="https://github.com/lxy071130" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/lxy071130'" />流溪</el-link
          >
          <el-link :underline="false" href="https://github.com/PaienNate" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/PaienNate'" />PaienNate</el-link
          >
          <el-link :underline="false" href="https://github.com/nodisease" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/nodisease'" />病</el-link
          >
          <el-link :underline="false" href="https://github.com/Stanlty998" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/Stanlty998'" />綮小灰</el-link
          >
          <el-link :underline="false" href="https://github.com/-" target="_blank"
            ><el-avatar
              shape="circle"
              :size="50"
              :src="urlBase + '/sd-api/utils/ga/-'" />大概不全，下版本纠正……</el-link
          >
        </div>

        <div style="margin-top: 2rem" class="subtitle">参考</div>
        <div>斯塔尼亚 - 塔系核心作者，指令实现过程中部分参考了塔系核心的指令表现</div>
        <div>赵喵喵 - ZhaoDice作者，早期指令参考之一</div>
        <div>Dice!核心的开发者们 - 同样的，在骰点格式和输出表现方面进行了参考</div>
        <div>FVTT - 经典的DND跑团平台，指令参考之一</div>
      </section>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { useStore } from '~/store';
import imgHaibao from '~/assets/haibao1.png';
import { urlBase } from '~/api';

const store = useStore();

const wesleyYoungNames = ['Wesley-Young', '白圣女', '盐巴猫'] as const;
const wesleyYoungName =
  wesleyYoungNames[Math.floor(Math.random() * wesleyYoungNames.length)] ?? wesleyYoungNames[0];

const paienNateSpecialNames = ['*走丢了', '*这个人上班去了'] as const;
const paienNateName =
  Math.random() < 0.35
    ? (paienNateSpecialNames[Math.floor(Math.random() * paienNateSpecialNames.length)] ??
      paienNateSpecialNames[0])
    : 'PaienNate';

const v16Contributors = [
  { github: 'Szzrain', name: 'Szzrain' },
  { github: 'fy0', name: '木落' },
  { github: 'MX-fox', name: '暮星' },
  { github: 'kenichiLyon', name: '山本健一' },
  { github: 'PaienNate', name: paienNateName },
  { github: 'baiyu-yu', name: '白鱼' },
  { github: 'lyjjl', name: 'SomeOne' },
  { github: 'kagangtuya-star', name: 'SilverDragon' },
  { github: 'oissevalt', name: '檀轶步棋' },
  { github: 'BQxiaojiao', name: 'BQxiaojiao' },
  { github: 'kainordherd', name: 'Kai' },
  { github: 'Wesley-Young', name: wesleyYoungName },
  { github: 'Lirvis', name: '莉尔维斯(Lirvis) (sealrepo)' },
  { github: 'Dontplay0112', name: 'Dontplay (UI)' },
  { github: 'ShiaNyaa', name: '希亚 (UI)' },
] as const;

onBeforeMount(async () => {
  await store.logFetchAndClear();
});

onBeforeUnmount(() => {
  // clearInterval(timerId)
});
</script>

<style scoped lang="css">
.about-intro {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 32px;
}

.about-logo {
  width: 160px;
  height: auto;
}

.about-info {
  flex: 1;
  min-width: min(320px, 100%);
}

.about-lead {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--seal-text-regular);
}

.about-facts {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 8px 24px;
  margin: 0;
  font-size: 13px;
}

.about-facts > div {
  display: contents;
}

.about-facts dt {
  color: var(--seal-text-secondary);
}

.about-facts dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.about-muted {
  color: var(--seal-text-secondary);
}

.about {
  font-size: 13px;
  line-height: 1.8;
}

.subtitle {
  margin: 20px 0 8px;
  font-weight: 600;
}

.developers {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
}

.developers .el-avatar {
  margin-right: 8px;
}

.developers .el-avatar {
  background: var(--seal-surface-muted)
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239aa3ad'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z'/%3E%3C/svg%3E")
    center / 60% no-repeat;
}

.developers .developer-muted {
  --el-link-text-color: var(--el-text-color-secondary);
  --el-link-hover-text-color: var(--el-text-color-secondary);
}

.developers .developer-muted .el-avatar {
  filter: grayscale(1);
  opacity: 0.6;
}
</style>
