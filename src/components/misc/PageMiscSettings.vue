<template>
  <section class="workspace-page settings-workspace">
    <header class="workspace-header settings-header">
      <div>
        <h1 class="workspace-title">综合设置</h1>
        <p class="workspace-subtitle">按配置领域查看与修改骰子设置。</p>
      </div>
    </header>

    <div class="workspace-body settings-layout">
      <aside class="settings-sidebar">
        <nav class="settings-nav" aria-label="设置分类">
          <button
            v-for="category in settingsCategories"
            :key="category.id"
            type="button"
            :class="{ active: activeCategory === category.id }"
            :aria-current="activeCategory === category.id ? 'page' : undefined"
            aria-controls="settings-category-panel"
            @click="activeCategory = category.id">
            {{ category.label }}
          </button>
        </nav>
      </aside>

      <div class="settings-main">
        <div class="settings-mobile-category">
          <label id="settings-category-label" for="settings-category-select">设置分类</label>
          <el-select
            id="settings-category-select"
            v-model="activeCategory"
            name="settingsCategory"
            aria-labelledby="settings-category-label"
            aria-label="设置分类">
            <el-option
              v-for="category in settingsCategories"
              :key="category.id"
              :label="category.label"
              :value="category.id" />
          </el-select>
        </div>

        <div
          id="settings-category-panel"
          class="settings-scroll"
          role="region"
          aria-labelledby="settings-category-heading"
          tabindex="0">
          <div class="settings-category-heading">
            <h2 id="settings-category-heading">{{ activeCategoryInfo.label }}</h2>
            <p>{{ activeCategoryInfo.description }}</p>
          </div>

          <el-form
            label-position="top"
            class="settings-form"
            :disabled="saving || !settingsLoaded"
            @submit.prevent="submit">
            <div v-if="activeCategory === 'access'" class="settings-fields">
              <h3>Master 管理</h3>
              <!-- <el-form-item label="">
              <template #label>
                <div>
                  <span>重载脚本 (临时)</span>
                  <el-tooltip content="用于误操作或被抢占 master。执行这条指令可以直接获取 master 权限并踢掉其他所有人，指令有效期 20 分钟">
                    <el-icon><question-filled /></el-icon>
                  </el-tooltip>
                </div>
              </template>
              <div>
                <el-button @click="store.scriptReload()">重载脚本</el-button>
              </div>
            </el-form-item> -->

              <!--
            <el-form-item label="">
              <template #label>
                <div>
                  <span>Master 解锁码</span>
                  <el-tooltip
                    content="用于误操作或被抢占master。执行这条指令可以直接获取master权限并踢掉其他所有人，指令有效期20分钟">
                    <el-icon><question-filled /></el-icon>
                  </el-tooltip>
                </div>
              </template>
              <div>
                <el-button v-if="!isShowUnlockCode" @click="isShowUnlockCode = true">查看</el-button>
                <div v-else style="font-weight: bold">.master unlock {{ config.masterUnlockCode }}</div>
              </div>
            </el-form-item>
            -->

              <el-form-item label="Master列表">
                <template #label>
                  <div>
                    <span>Master 列表</span>
                    <el-tooltip
                      raw-content
                      content="单行格式: QQ:12345<br>也可添加群ID, 在指定的群中所有人均视为有Master权限">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <template v-if="config.diceMasters && config.diceMasters.length">
                  <div
                    :key="index"
                    v-for="(k2, index) in config.diceMasters"
                    class="settings-list-item">
                    <div class="settings-list-control">
                      <el-input
                        v-model="config.diceMasters[index]"
                        :autosize="true"
                        :name="`diceMaster-${index}`"
                        :aria-label="`Master 列表第 ${Number(index) + 1} 项`" />
                      <el-button
                        native-type="button"
                        text
                        :disabled="saving"
                        :icon="Delete"
                        :aria-label="`删除第 ${Number(index) + 1} 个 Master`"
                        @click="removeItem(config.diceMasters, index as number)" />
                    </div>
                  </div>
                </template>
                <el-button
                  native-type="button"
                  class="settings-list-add"
                  :disabled="saving"
                  :icon="Plus"
                  @click="config.diceMasters = addItem(config.diceMasters)">
                  添加 Master
                </el-button>
              </el-form-item>

              <el-form-item label="消息通知列表">
                <template #label>
                  <div>
                    <span>消息通知列表</span>
                    <el-tooltip
                      raw-content
                      content="每项可独立启用与选择通知分类。<br>支持的前缀：QQ:、QQ-Group:、QQ-CH-Group:、Mail:、…<br>Mail: 邮箱类型不支持禁用或分类筛选。">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>

                <template v-if="noticeItems.length">
                  <div :key="index" v-for="(item, index) in noticeItems" class="settings-list-item">
                    <div class="notice-item-row">
                      <el-input
                        v-model="item.id"
                        class="notice-id-input"
                        :autosize="true"
                        :name="`notice-recipient-${index}`"
                        :aria-label="`消息通知对象第 ${index + 1} 项`"
                        :placeholder="noticeItemPlaceholder"
                        @change="onNoticeItemIdChanged(item)" />
                      <el-checkbox
                        v-model="item.enabled"
                        class="notice-enabled-checkbox"
                        :aria-label="`启用消息通知对象第 ${index + 1} 项`"
                        :disabled="isMailNoticeItem(item.id)"
                        >启用</el-checkbox
                      >
                      <el-select
                        v-model="item.categories"
                        class="notice-category-select"
                        :name="`notice-categories-${index}`"
                        :aria-label="`消息通知对象第 ${index + 1} 项的通知分类`"
                        multiple
                        collapse-tags
                        collapse-tags-tooltip
                        :disabled="!item.enabled || isMailNoticeItem(item.id)"
                        :placeholder="item.categoriesDirty ? '未选择分类' : '全部'"
                        popper-class="notice-category-popper"
                        @change="markCategoriesDirty(item)">
                        <el-option
                          v-for="option in noticeCategoryOptions"
                          :key="option.value"
                          :label="option.label"
                          :value="option.value">
                          <div
                            style="
                              display: flex;
                              width: 100%;
                              flex-direction: column;
                              align-items: flex-start;
                              text-align: left;
                              line-height: 1.2;
                            ">
                            <span>{{ option.label }}</span>
                            <el-text
                              type="info"
                              size="small"
                              style="align-self: flex-start; text-align: left"
                              >{{ option.description }}</el-text
                            >
                          </div>
                        </el-option>
                      </el-select>
                      <el-button
                        native-type="button"
                        text
                        :disabled="saving"
                        :icon="Delete"
                        :aria-label="`删除第 ${index + 1} 个消息通知对象`"
                        @click="removeNoticeItem(index)" />
                    </div>
                  </div>
                </template>
                <el-button
                  native-type="button"
                  class="settings-list-add"
                  :disabled="saving"
                  :icon="Plus"
                  @click="addNoticeItem">
                  添加通知对象
                </el-button>
              </el-form-item>

              <el-form-item label="邮箱通知">
                <template #label
                  ><div>
                    <span>邮箱通知</span>
                    <el-tooltip
                      raw-content
                      content="为处理某些平台通知频繁引起的问题，启用后<b>只会通过邮件</b>进行通知">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip></div
                ></template>
                <el-checkbox v-model="config.mailEnable" aria-label="开启邮箱通知" label="开启" />
              </el-form-item>
              <el-form-item label="发件邮箱">
                <template #label
                  ><div>
                    <span>发件邮箱</span>
                    <el-tooltip
                      raw-content
                      content="特别提醒：QQ号被冻结后对应账号的邮箱也无法使用">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip></div
                ></template>
                <el-input
                  v-model="config.mailFrom"
                  name="mailFrom"
                  aria-label="发件邮箱"
                  style="width: 12rem" />
              </el-form-item>
              <el-form-item label="邮箱密钥">
                <template #label
                  ><div>
                    <span>邮箱密钥</span>
                    <el-tooltip
                      raw-content
                      content="请注意不一定是密码，例如 QQ邮箱就需要在设置界面生成授权码">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip></div
                ></template>
                <el-input
                  v-model="config.mailPassword"
                  name="mailPassword"
                  aria-label="邮箱密钥"
                  style="width: 12rem" />
              </el-form-item>
              <el-form-item label="SMTP 地址">
                <template #label
                  ><div>
                    <span>SMTP 地址</span>
                    <el-tooltip raw-content content="例如 smtp.qq.com">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip></div
                ></template>
                <el-input
                  v-model="config.mailSmtp"
                  name="mailSmtp"
                  aria-label="SMTP 地址"
                  style="width: 12rem" />
              </el-form-item>
              <el-form-item>
                <template #label>
                  <div>
                    <el-text>发送测试邮件</el-text>
                    <el-tooltip content="向通知列表发送测试邮件，便于检查邮件相关配置">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-button native-type="button" :disabled="saving" @click="mailTest">
                  发送测试邮件
                </el-button>
              </el-form-item>
            </div>

            <div v-if="activeCategory === 'behavior'" class="settings-fields">
              <el-form-item>
                <template #label>
                  <div>
                    <span>私骰模式</span>
                    <el-tooltip raw-content content="只允许信任用户拉入群聊">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-checkbox v-model="config.trustOnlyMode" aria-label="私骰模式" label="开启" />
              </el-form-item>

              <el-form-item>
                <template #label>
                  <div>
                    <span>允许自由开关</span>
                    <el-tooltip
                      raw-content
                      content="默认开启。允许任何人执行bot on/off和ext on/off，否则只有邀请者、管理员和master进行操作">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-checkbox
                  v-model="config.botExtFreeSwitch"
                  aria-label="允许自由开关"
                  label="开启" />
              </el-form-item>

              <el-form-item>
                <template #label>
                  <div>
                    <span>启用戳一戳</span>
                    <el-tooltip raw-content content="默认开启。仅QQ平台，关闭后不回应戳一戳。">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-space direction="vertical" alignment="flex-start" size="small">
                  <el-checkbox v-model="config.QQEnablePoke" aria-label="启用戳一戳" label="开启" />
                  <el-text type="warning" size="small"
                    >启用前请确认你使用的 QQ
                    连接方式支持该功能，若不支持请关闭该功能来避免日志中出现相关报错。</el-text
                  >
                </el-space>
              </el-form-item>

              <el-form-item>
                <template #label>
                  <div>
                    <span>限制.text 指令</span>
                    <el-tooltip
                      raw-content
                      content="默认开启。开启后只有master和信任用户可使用.text指令。如果你不了解这个指令，一定要开启。">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-checkbox
                  v-model="config.textCmdTrustOnly"
                  aria-label="限制 .text 指令"
                  label="开启" />
              </el-form-item>

              <el-form-item>
                <template #label>
                  <div>
                    <span>忽略.bot 裸指令</span>
                    <el-tooltip raw-content content="默认关闭。开启后在群聊中只有@骰子才会响应.bot">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-checkbox
                  v-model="config.ignoreUnaddressedBotCmd"
                  aria-label="忽略未提及骰子的 .bot 裸指令"
                  label="开启" />
              </el-form-item>

              <el-form-item v-if="!config.ignoreUnaddressedBotCmd">
                <template #label>
                  <div>
                    <span>允许直接退群</span>
                    <el-tooltip raw-content content="默认关闭。开启后用户无需@骰娘即可执行退群指令">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-checkbox
                  v-model="config.botExitWithoutAt"
                  aria-label="允许直接退群"
                  label="开启" />
              </el-form-item>

              <el-form-item>
                <template #label>
                  <div>
                    <span>存活确认 (骰狗)</span>
                    <el-tooltip
                      raw-content
                      content="定期向通知列表发送消息，以便于骰主知晓存活状态">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-checkbox
                  v-model="config.aliveNoticeEnable"
                  aria-label="存活确认"
                  label="开启" />
              </el-form-item>

              <el-form-item>
                <template #label>
                  <div>
                    <span>存活消息间隔</span>
                    <el-tooltip
                      raw-content
                      content="间隔写法请参阅 <a href='https://pkg.go.dev/github.com/robfig/cron' target='_blank'>cron文档</a>。注意:重启骰子后重新计时。">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-input
                  v-model="config.aliveNoticeValue"
                  name="aliveNoticeValue"
                  aria-label="存活消息间隔"
                  style="width: 12rem" />
              </el-form-item>

              <el-form-item>
                <template #label
                  ><div>
                    <span>日志记录提示</span>
                    <el-tooltip
                      raw-content
                      content="每记录N条文本后，主动发送一条提醒信息，避免忘记log off">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip></div
                ></template>
                <div>
                  <div>
                    <el-checkbox
                      v-model="config.logSizeNoticeEnable"
                      aria-label="启用日志记录提示"
                      label="开启" />
                  </div>
                  <el-input
                    v-model="config.logSizeNoticeCount"
                    name="logSizeNoticeCount"
                    aria-label="日志记录提示条数"
                    type="number"
                    autosize
                    clearable
                    style="width: 14rem" />
                </div>
              </el-form-item>
            </div>

            <!--    <el-form-item>-->
            <!--      <template #label>-->
            <!--        <div>-->
            <!--          <span>.bot 附加文本</span>-->
            <!--        </div>-->
            <!--      </template>-->
            <!--      <el-input v-model="config.customBotExtraText" type="textarea" autosize clearable style="width: 14rem;" />-->
            <!--    </el-form-item>-->

            <div v-if="activeCategory === 'rate-limit'" class="settings-fields">
              <h3>刷屏警告</h3>
              <el-form-item>
                <template #label>
                  <div>
                    <span>刷屏警告开关</span>
                    <el-tooltip
                      raw-content
                      content="默认关闭。开启后会对使用指令过快的用户和群组进行警告，警告后继续使用指令会增加怒气值，只对QQ平台有效">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-checkbox
                  v-model="config.rateLimitEnabled"
                  aria-label="刷屏警告开关"
                  label="开启" />
              </el-form-item>
              <el-form-item>
                <template #label>
                  <div>
                    <span>刷屏警告速率</span>
                  </div>
                </template>
                个人速率
                <el-tooltip
                  raw-content
                  content="支持以下格式: <br/>@every 3s 每3秒一个<br>3 每秒3个">
                  <el-icon><question-filled /></el-icon>
                </el-tooltip>
                <el-input
                  v-model="config.personalReplenishRate"
                  name="personalReplenishRate"
                  aria-label="个人刷屏警告速率"
                  clearable
                  style="width: 14rem" />
                <br />
              </el-form-item>
              <el-form-item>
                个人上限
                <el-input-number
                  v-model="config.personalBurst"
                  name="personalBurst"
                  aria-label="个人刷屏令牌上限"
                  :min="1"
                  :step="1"
                  clearable />
              </el-form-item>
              <el-form-item>
                群组速率
                <el-tooltip
                  raw-content
                  content="支持以下格式: <br/>@every 3s 每3秒一个<br>3 每秒3个">
                  <el-icon><question-filled /></el-icon>
                </el-tooltip>
                <el-input
                  v-model="config.groupReplenishRate"
                  name="groupReplenishRate"
                  aria-label="群组刷屏警告速率"
                  clearable
                  style="width: 14rem" />
                <br />
              </el-form-item>
              <el-form-item>
                群组上限
                <el-input-number
                  v-model="config.groupBurst"
                  name="groupBurst"
                  aria-label="群组刷屏令牌上限"
                  :min="1"
                  :step="1"
                  clearable />
              </el-form-item>

              <el-form-item>
                连续相同指令判定窗口(秒)
                <el-tooltip
                  raw-content
                  content="在这个时间窗口内，连续使用同一条指令会被视作刷屏加重。">
                  <el-icon><question-filled /></el-icon>
                </el-tooltip>
                <el-input-number
                  v-model="config.spamSameCommandWindowSec"
                  name="spamSameCommandWindowSec"
                  aria-label="连续相同指令判定窗口（秒）"
                  :min="1"
                  :step="1"
                  :value-on-clear="defaultSpamSameCommandWindowSec" />
              </el-form-item>

              <el-form-item>
                恢复倍率上限
                <el-tooltip
                  raw-content
                  content="连续同指令越多，令牌恢复越慢；该值用于限制最大减速倍率，例如 5 表示最多变慢 5 倍。">
                  <el-icon><question-filled /></el-icon>
                </el-tooltip>
                <el-input-number
                  v-model="config.spamRecoveryMultiplierMax"
                  name="spamRecoveryMultiplierMax"
                  aria-label="令牌恢复倍率上限"
                  :min="1"
                  :step="1"
                  clearable />
              </el-form-item>

              <el-form-item>
                <el-text>
                  <div>
                    刷屏警告工作原理如下：
                    <ul>
                      <li>每群每用户独立有一个装令牌的桶，桶最多能装「上限」枚令牌</li>
                      <li>每次指令视作拿走一枚令牌</li>
                      <li>当桶里没有令牌时，试图拿走令牌将被阻止（触发警告）</li>
                      <li>桶以「速率」自动补充令牌</li>
                      <li>若在窗口期内连续发送相同指令，会临时降低恢复速度（最多到上限倍率）</li>
                    </ul>
                    处置时，优先惩罚个人刷屏，其次是群组内许多人一起刷屏。
                  </div>
                  <div>如果您感觉难以理解，为了稳定性还是不要更改比较好！</div>
                  <div>对速率限制的所有更改 <strong>重启后生效</strong></div>
                </el-text>
              </el-form-item>
            </div>

            <div v-if="activeCategory === 'network'" class="settings-fields">
              <h3>访问控制</h3>
              <el-form-item label="UI界面地址">
                <template #label>
                  <div>
                    <span>UI 界面地址</span>
                    <el-tooltip
                      raw-content
                      content="0.0.0.0:3211 主要用于服务器，代表可以在公网中用你的手机和电脑访问 <br>127.0.0.1:3211 主要用于自己的电脑/手机，只能在当前设备上管理余烬<br>注意：重启骰子后生效！<br>另，想开多个余烬必须修改端口号！">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-autocomplete
                  v-model="config.serveAddress"
                  name="serveAddress"
                  aria-label="UI 界面地址"
                  clearable
                  :fetch-suggestions="querySearch">
                  <template #default="{ item }">
                    <div class="value">{{ item.link }}</div>
                  </template>
                </el-autocomplete>
              </el-form-item>

              <el-form-item label="UI界面密码">
                <template #label>
                  <div>
                    <span>UI 界面密码</span>
                    <el-tooltip content="公网用户一定要加，登录后会自动记住一段时间！">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>

                <el-input
                  v-model="config.uiPassword"
                  name="uiPassword"
                  aria-label="UI 界面密码"
                  type="password"
                  show-password />
              </el-form-item>

              <el-form-item label="托盘提示文本">
                <template #label>
                  <div>
                    <span>托盘提示文本</span>
                    <el-tooltip
                      :content="`自定义前缀最长${trayTooltipMaxLength}个字符；留空时使用“余烬TRPG骰点核心”，版本号和端口会自动追加`">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <div>
                  <el-input
                    v-model="config.trayTooltip"
                    name="trayTooltip"
                    aria-label="托盘提示文本"
                    clearable
                    placeholder="余烬TRPG骰点核心"
                    show-word-limit
                    :maxlength="trayTooltipMaxLength"
                    style="width: 14rem" />
                </div>
              </el-form-item>

              <h3>QQ 频道设置</h3>
              <el-form-item>
                <template #label>
                  <div>
                    <span>总开关</span>
                    <el-tooltip raw-content content="如果关闭，将忽略任何频道消息">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-checkbox
                  v-model="config.workInQQChannel"
                  aria-label="QQ 频道总开关"
                  label="开启" />
              </el-form-item>

              <el-form-item>
                <template #label>
                  <div>
                    <span>自动 bot on</span>
                    <el-tooltip
                      raw-content
                      content="如果开启，需要在每一个子频道手动bot off，推荐关闭">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-checkbox
                  v-model="config.QQChannelAutoOn"
                  aria-label="QQ 频道自动 bot on"
                  label="开启" />
              </el-form-item>

              <el-form-item>
                <template #label>
                  <div>
                    <span>记录消息日志</span>
                    <el-tooltip
                      raw-content
                      content="是否记录频道消息到日志，如果频道较多，可能造成严重刷屏。<br>若关闭则仅在日志记录指令，推荐关闭">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-checkbox
                  v-model="config.QQChannelLogMessage"
                  aria-label="记录 QQ 频道消息日志"
                  label="开启" />
              </el-form-item>
            </div>

            <div v-if="activeCategory === 'dice'" class="settings-fields">
              <h3>游戏</h3>
              <el-form-item>
                <template #label>
                  <div>
                    <span>COC 默认房规</span>
                    <el-tooltip raw-content content="可设置为0-5，以及dg（DeltaGreen）">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-input
                  v-model="config.defaultCocRuleIndex"
                  name="defaultCocRuleIndex"
                  aria-label="COC 默认房规"
                  clearable
                  style="width: 14rem" />
              </el-form-item>

              <el-form-item>
                <template #label>
                  <div>
                    <span>COC 制卡上限</span>
                    <el-tooltip raw-content content=".coc n中n的最大值，1-12之间，默认5">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-input
                  v-model="config.maxCocCardGen"
                  name="maxCocCardGen"
                  aria-label="COC 制卡上限"
                  clearable
                  style="width: 14rem" />
              </el-form-item>

              <el-form-item>
                <template #label>
                  <div>
                    <span>制卡使用合并转发</span>
                    <el-tooltip raw-content content="开启后，.coc 的结果会尝试以“合并转发”格式发送">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-checkbox
                  v-model="config.cocCardMergeForward"
                  aria-label="制卡使用合并转发"
                  label="开启" />
              </el-form-item>

              <el-form-item>
                <template #label>
                  <div>
                    <span>骰点轮数上限</span>
                    <el-tooltip raw-content content=".r n#中n的最大值，1-25之间，默认12">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-input
                  v-model="config.maxExecuteTime"
                  name="maxExecuteTime"
                  aria-label="骰点轮数上限"
                  clearable
                  style="width: 14rem" />
              </el-form-item>
            </div>

            <div v-if="activeCategory === 'maintenance'" class="settings-fields">
              <h3>余烬</h3>
              <el-form-item>
                <template #label>
                  <span>保护开关</span>
                </template>
                <el-checkbox
                  v-model="isUploadEnable"
                  aria-label="我已阅读功能描述"
                  label="我已阅读功能描述" />
              </el-form-item>

              <el-form-item>
                <template #label>
                  <div>
                    <span>固件升级</span>
                    <el-tooltip raw-content content="使用余烬安装包进行覆盖升级">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-space v-if="store.curDice.baseInfo.containerMode" wrap>
                  <el-tooltip content="容器模式下固件升级被禁用，请手动拉取最新镜像">
                    <el-button native-type="button" :icon="Upload" disabled>上传压缩包</el-button>
                  </el-tooltip>
                  <el-text type="warning" size="small"
                    >容器模式下固件升级被禁用，请手动拉取最新镜像</el-text
                  >
                </el-space>
                <el-upload
                  ref="firmwareUploadRef"
                  v-else
                  class="upload"
                  action=""
                  accept=".zip,.tar.gz"
                  :before-upload="beforeUpload"
                  :limit="1"
                  :on-exceed="handleFirmwareUploadExceed"
                  :file-list="fileList"
                  :disabled="!isUploadEnable || firmwareUploadLoading || saving"
                  :show-file-list="false">
                  <el-button
                    native-type="button"
                    :icon="Upload"
                    :disabled="!isUploadEnable || firmwareUploadLoading || saving"
                    :loading="firmwareUploadLoading"
                    >{{ firmwareUploadLoading ? '上传中…' : '上传压缩包' }}</el-button
                  >
                </el-upload>
              </el-form-item>

              <el-form-item>
                <div>使用指定的压缩包对当前余烬进行覆盖，上传完成后会自动重启余烬。</div>
                <div>请注意尽量不要从高版本降低到低版本，数据库有可能不兼容。</div>
                <div>一次仅支持上传一个升级包，选择文件后会显示上传进度，请耐心等待反馈。</div>
              </el-form-item>
            </div>

            <div v-if="activeCategory === 'maintenance'" class="settings-fields">
              <h3>群组与日常维护</h3>
              <el-form-item label="加好友验证信息">
                <template #label>
                  <div>
                    <span>加好友验证</span>
                    <el-tooltip
                      raw-content
                      content="加好友时必须输入正确的验证信息才能通过<br>注意：若使用“回答问题并由我确认”，只写问题答案，有多个答案用空格隔开：<br>问题1答案 问题2答案<br>注意问题答案中本身不能有空格">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>

                <el-input
                  v-model="config.friendAddComment"
                  name="friendAddComment"
                  aria-label="加好友验证"
                  type="text"
                  clearable
                  :placeholder="'为空则填写任意均可通过'" />
              </el-form-item>

              <el-form-item label="不活跃N天后自动退群">
                <template #label>
                  <div>
                    <span>自动退群阈值</span>
                    <el-tooltip
                      raw-content
                      content="每天凌晨4时检查所有群聊的不活跃天数, 若超过设定天数则自动退群<br>设置为0以关闭该功能">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-input-number
                  v-model="config.quitInactiveThreshold"
                  name="quitInactiveThreshold"
                  aria-label="自动退群不活跃天数阈值"
                  type="number"
                  style="width: auto"
                  :placeholder="'不活跃N天后自动退出'" />
              </el-form-item>

              <el-form-item>
                <template #label>
                  <div>
                    <span>自动退群简报</span>
                    <el-tooltip
                      raw-content
                      content="此开关打开时，仅有自动退群任务开始执行与执行全部结束会发送自动退群通知">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-checkbox
                  v-model="config.quitInactiveNoticeSummaryMode"
                  aria-label="自动退群简报"
                  label="开启" />
              </el-form-item>

              <el-form-item label="退群批次大小">
                <el-input-number
                  v-model="config.quitInactiveBatchSize"
                  name="quitInactiveBatchSize"
                  aria-label="退群批次大小"
                  type="number"
                  style="width: auto" />
              </el-form-item>

              <el-form-item label="退群批次间隔(分)">
                <el-input-number
                  v-model="config.quitInactiveBatchWait"
                  name="quitInactiveBatchWait"
                  aria-label="退群批次间隔（分）"
                  type="number"
                  style="width: auto" />
              </el-form-item>
            </div>

            <div v-if="activeCategory === 'behavior'" class="settings-fields">
              <h3>命令与回复</h3>
              <el-form-item label="QQ回复延迟(秒)">
                <div class="settings-range-field">
                  <el-input
                    v-model="config.messageDelayRangeStart"
                    name="messageDelayRangeStart"
                    aria-label="QQ 回复最短延迟（秒）"
                    type="number" />
                  <span aria-hidden="true">-</span>
                  <el-input
                    v-model="config.messageDelayRangeEnd"
                    name="messageDelayRangeEnd"
                    aria-label="QQ 回复最长延迟（秒）"
                    type="number" />
                </div>
              </el-form-item>

              <el-form-item>
                <template #label>
                  <div>
                    <span>{{ `<玩家名>` }}外框</span>
                    <el-tooltip
                      raw-content
                      content="默认开启。建议开启，这可以防止用户改名为指令(如.bot)，并利用播报去唤醒其他骰子造成刷屏。">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>
                <el-checkbox
                  v-model="config.playerNameWrapEnable"
                  aria-label="玩家名外框"
                  label="开启"
                  @click="nameWrapUncheck" />
              </el-form-item>

              <el-form-item label="日志仅记录指令">
                <el-checkbox
                  v-model="config.onlyLogCommandInGroup"
                  aria-label="在群聊中日志仅记录指令"
                  label="在群聊中" />
                <el-checkbox
                  v-model="config.onlyLogCommandInPrivate"
                  aria-label="在私聊中日志仅记录指令"
                  label="在私聊中" />
              </el-form-item>

              <el-form-item label="拒绝加入新群">
                <el-checkbox
                  v-model="config.refuseGroupInvite"
                  aria-label="拒绝加群（仅在非强制拉入时生效）"
                  label="拒绝加群(仅在非强制拉入时起效)" />
              </el-form-item>

              <el-form-item label="指令前缀">
                <template #label>
                  <div>
                    <span>指令前缀</span>
                    <el-tooltip content="举例：添加!作为指令前缀，运行 !r 可以骰点">
                      <el-icon><question-filled /></el-icon>
                    </el-tooltip>
                  </div>
                </template>

                <template v-if="config.commandPrefix && config.commandPrefix.length">
                  <div
                    :key="index"
                    v-for="(k2, index) in config.commandPrefix"
                    class="settings-list-item">
                    <div class="settings-list-control">
                      <el-input
                        v-model="config.commandPrefix[index]"
                        :autosize="true"
                        :name="`commandPrefix-${index}`"
                        :aria-label="`指令前缀第 ${Number(index) + 1} 项`" />
                      <el-button
                        native-type="button"
                        text
                        :disabled="saving"
                        :icon="Delete"
                        :aria-label="`删除第 ${Number(index) + 1} 个指令前缀`"
                        @click="removeItem(config.commandPrefix, index as number)" />
                    </div>
                  </div>
                </template>
                <el-button
                  native-type="button"
                  class="settings-list-add"
                  :disabled="saving"
                  :icon="Plus"
                  @click="config.commandPrefix = addItem(config.commandPrefix)">
                  添加指令前缀
                </el-button>
              </el-form-item>

              <h3>扩展及扩展指令</h3>
              <div class="settings-extension-list">
                <div :key="i.name" v-for="i in config.extDefaultSettings">
                  <span>扩展：{{ i.name }}</span>
                  <div>
                    禁用指令
                    <el-button
                      native-type="button"
                      :key="k"
                      v-for="(v, k) in i.disabledCommand"
                      style="margin-left: 0"
                      :type="v ? 'danger' : ''"
                      size="small"
                      :aria-pressed="v"
                      :disabled="saving"
                      @click="i.disabledCommand[k] = !v"
                      >{{ k }}</el-button
                    >
                  </div>
                  <div>
                    <el-checkbox v-model="i.autoActive" :aria-label="`${i.name} 入群自动开启`"
                      >入群自动开启</el-checkbox
                    >
                  </div>
                </div>
              </div>
              <!-- <el-input v-model="config.helpMasterLicense" type="textarea" autosize clearable style="width: auto;" /> -->
            </div>
          </el-form>
        </div>

        <footer class="workspace-savebar settings-savebar">
          <p
            class="settings-save-status"
            :class="{
              'is-dirty': modified && !saving,
              'is-saving': saving || (!settingsLoaded && !settingsLoadError),
              'is-error': saveError || settingsLoadError,
            }"
            role="status"
            aria-live="polite">
            {{
              settingsLoadError
                ? '读取设置失败，无法编辑或保存。'
                : !settingsLoaded
                  ? '正在读取设置…'
                  : saving
                    ? '正在保存设置…'
                    : saveError
                      ? '保存失败，修改仍未保存。请检查后重试。'
                      : modified
                        ? '有未保存的修改'
                        : '所有设置已保存'
            }}
          </p>
          <div class="settings-save-actions">
            <el-button
              native-type="button"
              :disabled="!settingsLoaded || !modified || saving"
              @click="submitGiveup"
              >放弃改动</el-button
            >
            <el-button
              native-type="button"
              type="primary"
              :disabled="!settingsLoaded || !modified || saving"
              :loading="saving"
              @click="submit"
              >保存设置</el-button
            >
          </div>
        </footer>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { genFileId, type UploadInstance, type UploadProps, type UploadRawFile } from 'element-plus';
import { Delete, Plus, QuestionFilled, Upload } from '@element-plus/icons-vue';
import { cloneDeep, toNumber } from 'lodash-es';
import { postMailTest, postUploadToUpgrade } from '~/api/dice';
import {
  ALL_NOTICE_CATEGORIES,
  NOTICE_CATEGORY_DESCRIPTIONS,
  NOTICE_CATEGORY_LABELS,
  fromNoticeItems,
  isMailNoticeItem,
  toNoticeItems,
  type NoticeItem,
} from '~/api/dice/noticeCodec';
import { useStore } from '~/store';
import { objDiff, passwordHash } from '~/utils';
import { showProgressMessage } from '~/utils/progress-message';
import { formatUploadFailureMessage } from '~/utils/upload-error';

const minFirmwareProgressMessageDuration = 800;
// 与 core 的 dice.MaxTrayTooltipPrefixLength 保持一致，超出会被后端拒绝保存。
const trayTooltipMaxLength = 10;
// 与 Scardice-core 的 dice.DefaultConfig.SpamSameCommandWindowSec 保持一致。
const defaultSpamSameCommandWindowSec = 30;

const store = useStore();
const settingsCategories = [
  {
    id: 'access',
    label: '权限与通知',
    description: 'Master 列表、通知对象，以及邮件发送配置。',
  },
  {
    id: 'behavior',
    label: '机器人行为与指令',
    description: '机器人开关、指令响应、运行提示、回复格式及扩展指令。',
  },
  {
    id: 'rate-limit',
    label: '刷屏防护',
    description: '个人与群组的触发速率、令牌上限和重复指令恢复倍率。',
  },
  {
    id: 'network',
    label: '连接与 QQ 频道',
    description: '管理界面地址与密码、托盘提示文本及 QQ 频道消息处理。',
  },
  {
    id: 'dice',
    label: '骰点与规则',
    description: 'COC 默认房规、制卡行为与骰点轮数上限。',
  },
  {
    id: 'maintenance',
    label: '群组与维护',
    description: '固件升级、好友验证与不活跃群组退出策略。',
  },
] as const;
type SettingsCategory = (typeof settingsCategories)[number]['id'];
const activeCategory = ref<SettingsCategory>('access');
const activeCategoryInfo = computed(
  () => settingsCategories.find(category => category.id === activeCategory.value)!,
);

const config = ref<any>({});
const fileList = ref<any[]>([]);
const firmwareUploadRef = ref<UploadInstance>();

// const isShowUnlockCode = ref(false);
const modified = ref(false);
const settingsLoaded = ref(false);
const settingsLoadError = ref(false);
const saving = ref(false);
const saveError = ref(false);
const isUploadEnable = ref(false);
const firmwareUploadLoading = ref(false);

const noticeItems = ref<NoticeItem[]>([]);

const noticeItemPlaceholder = '例如 QQ:12345 / QQ-Group:12345 / Mail:foo@bar.com';

const noticeCategoryOptions = ALL_NOTICE_CATEGORIES.map(value => ({
  value,
  label: NOTICE_CATEGORY_LABELS[value],
  description: NOTICE_CATEGORY_DESCRIPTIONS[value],
}));

function syncNoticeItemsFromConfig() {
  noticeItems.value = toNoticeItems(config.value.noticeIds);
}

function addNoticeItem() {
  noticeItems.value.push({
    id: '',
    enabled: true,
    categories: [],
    categoriesDirty: false,
  });
}

function removeNoticeItem(index: number) {
  noticeItems.value.splice(index, 1);
}

function onNoticeItemIdChanged(item: NoticeItem) {
  if (isMailNoticeItem(item.id)) {
    item.enabled = true;
    item.categories = [];
    item.categoriesDirty = false;
  }
}

function markCategoriesDirty(item: NoticeItem) {
  if (isMailNoticeItem(item.id)) {
    item.categories = [];
    item.categoriesDirty = false;
    return;
  }
  item.categoriesDirty = true;
}

function normalizeProgress(progressEvent: { loaded?: number; progress?: number; total?: number }) {
  if (typeof progressEvent.progress === 'number' && Number.isFinite(progressEvent.progress)) {
    return Math.max(0, Math.min(100, Math.round(progressEvent.progress * 100)));
  }

  if (
    typeof progressEvent.loaded === 'number' &&
    typeof progressEvent.total === 'number' &&
    progressEvent.total > 0
  ) {
    return Math.max(
      0,
      Math.min(100, Math.round((progressEvent.loaded / progressEvent.total) * 100)),
    );
  }

  return undefined;
}

const beforeUpload = async (file: any) => {
  if (firmwareUploadLoading.value) {
    return false;
  }

  firmwareUploadLoading.value = true;
  const uploadStartedAt = Date.now();
  const progressMessage = showProgressMessage({
    title: '固件升级上传中',
    message: `正在上传 ${file.name || '升级包'}，大文件在弱网下可能耗时较久，请勿关闭页面。`,
    indeterminate: true,
    type: 'info',
  });

  try {
    await postUploadToUpgrade(file, progressEvent => {
      const percentage = normalizeProgress(progressEvent);
      progressMessage.update({
        indeterminate: percentage === undefined,
        message:
          percentage === undefined
            ? `正在上传 ${file.name || '升级包'}，大文件在弱网下可能耗时较久，请勿关闭页面。`
            : `正在上传 ${file.name || '升级包'}，已完成 ${percentage}%。`,
        percentage,
      });
    });

    progressMessage.update({
      indeterminate: false,
      message: '上传完成，正在等待程序进入升级流程……',
      percentage: 100,
      status: 'success',
    });

    const visibleDuration = Date.now() - uploadStartedAt;
    const remainingVisibleDuration = Math.max(
      0,
      minFirmwareProgressMessageDuration - visibleDuration,
    );
    if (remainingVisibleDuration > 0) {
      await new Promise(resolve => window.setTimeout(resolve, remainingVisibleDuration));
    }

    progressMessage.close();
    ElMessage.success('上传完成，程序即将离线');
  } catch (error) {
    progressMessage.close();
    ElMessage.error(formatUploadFailureMessage(error));
    console.log(error);
  } finally {
    firmwareUploadLoading.value = false;
    fileList.value = [];
  }

  return false;
};

const handleFirmwareUploadExceed: UploadProps['onExceed'] = files => {
  const upload = firmwareUploadRef.value;
  if (!upload || files.length === 0 || firmwareUploadLoading.value) {
    return;
  }

  upload.clearFiles();
  const file = files[0] as UploadRawFile;
  file.uid = genFileId();
  upload.handleStart(file);
};

watch(
  [config, noticeItems],
  () => {
    saveError.value = false;
    modified.value = true;
  },
  {
    deep: true,
  },
);

const addItem = (k: any[]) => {
  if (!k) {
    k = [];
  }
  k.push('');
  return k;
};

const removeItem = (v: any[], index: number) => {
  v.splice(index, 1);
};

onBeforeMount(async () => {
  try {
    await store.diceConfigGet();
    const val = cloneDeep(store.curDice.config);
    if (!val.diceMasters || val.diceMasters.length === 0) {
      val.diceMasters = [''];
    }
    if (!val.commandPrefix || val.commandPrefix.length === 0) {
      val.commandPrefix = [''];
    }
    config.value = val;
    syncNoticeItemsFromConfig();
    nextTick(() => {
      modified.value = false;
      settingsLoaded.value = true;
    });
  } catch (error) {
    settingsLoadError.value = true;
    throw error;
  }
});

const submitGiveup = async () => {
  config.value = cloneDeep(store.curDice.config);
  syncNoticeItemsFromConfig();
  saveError.value = false;
  modified.value = false;
  nextTick(() => {
    modified.value = false;
  });
};

const submit = async () => {
  if (!settingsLoaded.value || saving.value || !modified.value) {
    return;
  }

  saving.value = true;
  saveError.value = false;

  try {
    const mod = objDiff(config.value, store.curDice.config);
    if (mod.uiPassword) {
      mod.uiPassword = await passwordHash(store.salt, mod.uiPassword);
    }

    if (mod.diceMasters) {
      mod.diceMasters = cloneDeep(config.value.diceMasters);
    }

    if (mod.commandPrefix) {
      mod.commandPrefix = cloneDeep(config.value.commandPrefix);
    }

    if (mod.noticeIds) {
      mod.noticeIds = fromNoticeItems(noticeItems.value);
    } else {
      // 后端未在原 config 中出现该字段时，强制以 UI 状态同步。
      const next = fromNoticeItems(noticeItems.value);
      const prev = cloneDeep(store.curDice.config.noticeIds ?? []);
      if (JSON.stringify(next) !== JSON.stringify(prev)) {
        mod.noticeIds = next;
      }
    }

    if (mod.extDefaultSettings) {
      mod.extDefaultSettings = cloneDeep(config.value.extDefaultSettings);
    }

    if (mod.logSizeNoticeCount) {
      mod.logSizeNoticeCount = toNumber(mod.logSizeNoticeCount);
    }

    if (mod.ignoreUnaddressedBotCmd) {
      mod.botExitWithoutAt = false;
    }

    await store.diceConfigSet(mod);
    await submitGiveup();
  } catch (error) {
    saveError.value = true;
    throw error;
  } finally {
    saving.value = false;
  }
};

interface LinkItem {
  value: string;
  link: string;
}

const links = ref<LinkItem[]>([
  { link: '外网：0.0.0.0:3211', value: '0.0.0.0:3211' },
  { link: '本机：127.0.0.1:3211', value: '127.0.0.1:3211' },
]);

const querySearch = (queryString: string, cb: any) => {
  const results = queryString ? links.value.filter(createFilter(queryString)) : links.value;
  // call callback function to return suggestion objects
  cb(results);
};
const createFilter = (queryString: string) => {
  return (restaurant: LinkItem) => {
    return restaurant.value.toLowerCase().indexOf(queryString.toLowerCase()) === 0;
  };
};

const nameWrapUncheck = (v: boolean) => {
  if (!v) {
    // 取消
    ElMessageBox.confirm(
      '不推荐：用户可能会改名为.bot/.dismiss，并利用骰点播报让群内其他骰子刷屏，确定要取消吗？',
      '',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ).catch(e => {
      config.value.playerNameWrapEnable = true;
    });
  }
};

const mailTest = async () => {
  const res = await postMailTest();
  if (res.result) {
    ElMessage.success('已尝试发送测试邮件');
  } else {
    ElMessage.error('发送测试邮件失败！' + res.err);
  }
};
</script>

<style scoped lang="css">
.settings-layout {
  display: grid;
  grid-template-columns: 216px minmax(0, 1fr);
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.settings-sidebar {
  min-width: 0;
  overflow-y: auto;
  padding-block: 8px;
  border-inline-end: 1px solid var(--seal-border-color-light);
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: max(4px, calc(var(--workspace-gap, 16px) / 4));
}

.settings-nav button {
  min-height: var(--workspace-row-height, 40px);
  padding: 6px 12px;
  border: 0;
  border-radius: var(--el-border-radius-base);
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  font-size: 14px;
  line-height: 1.35;
  text-align: start;
  cursor: pointer;
}

.settings-nav button:hover:not(.active) {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.settings-nav button.active {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}

.settings-nav button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.settings-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.settings-mobile-category {
  display: none;
}

.settings-scroll {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 20px clamp(16px, 3vw, 36px) 28px;
}

.settings-category-heading,
.settings-form {
  width: 100%;
  max-width: 56rem;
  margin-inline: auto;
}

.settings-category-heading {
  margin-bottom: var(--workspace-gap, 16px);
}

.settings-category-heading h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.35;
}

.settings-category-heading p {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.settings-form :deep(.el-form-item) {
  margin-bottom: var(--workspace-gap, 16px);
}

.settings-form :deep(.el-form-item__label) {
  height: auto;
  margin-bottom: 6px;
  color: var(--el-text-color-primary);
  font-size: 14px;
  line-height: 1.45;
}

.settings-form :deep(.el-input),
.settings-form :deep(.el-autocomplete),
.settings-form :deep(.el-select),
.settings-form :deep(.el-input-number) {
  max-width: 100%;
}

.settings-fields h3 {
  margin: max(18px, calc(var(--workspace-gap, 16px) * 1.5)) 0 var(--workspace-gap, 16px);
  color: var(--el-text-color-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.settings-fields h3:first-child {
  margin-top: 0;
}

.settings-list-item {
  width: 100%;
  margin-bottom: 8px;
}

.settings-list-add {
  margin-inline-start: 0;
}

.settings-list-control {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.settings-list-control .el-input {
  flex: 1 1 16rem;
  min-width: 0;
  max-width: 24rem;
}

.settings-list-control .el-button {
  flex: none;
  min-width: 40px;
  min-height: 40px;
}

.notice-item-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.notice-id-input {
  min-width: min(12rem, 100%);
  max-width: 24rem;
  flex: 1 1 14rem;
}

.notice-enabled-checkbox {
  flex: none;
  min-height: 40px;
  margin-right: 0;
}

.notice-category-select {
  width: 18rem;
  min-width: min(12rem, 100%);
  max-width: 100%;
  flex: 1 1 18rem;
}

.settings-range-field {
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(100%, 16rem);
}

.settings-range-field .el-input {
  flex: 1;
  min-width: 0;
}

.settings-extension-list {
  display: grid;
  gap: 16px;
  padding-inline-start: 16px;
}

.settings-extension-list > div {
  min-width: 0;
}

.settings-savebar {
  flex: none;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 20px max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--seal-border-color-light);
  background: var(--seal-panel-bg);
}

.settings-save-status {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.4;
}

.settings-save-status.is-dirty {
  color: var(--el-color-warning);
}

.settings-save-status.is-saving {
  color: var(--el-color-primary);
}

.settings-save-status.is-error {
  color: var(--el-color-danger);
}

.settings-save-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
}

.settings-save-actions :deep(.el-button) {
  min-height: 36px;
}

::global(.notice-category-popper .el-select-dropdown__item) {
  height: auto;
  min-height: 34px;
  padding-top: 6px;
  padding-bottom: 6px;
  text-align: left;
}

@media (max-width: 1023px) {
  .settings-layout {
    grid-template-columns: 184px minmax(0, 1fr);
  }

  .settings-scroll {
    padding: 18px 22px 24px;
  }

  .settings-savebar {
    padding-inline: 16px;
  }
}

@media (max-width: 767px) {
  .settings-layout {
    display: flex;
    flex-direction: column;
  }

  .settings-sidebar {
    display: none;
  }

  .settings-mobile-category {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--seal-border-color-light);
  }

  .settings-mobile-category label {
    color: var(--el-text-color-primary);
    font-size: 16px;
  }

  .settings-mobile-category :deep(.el-select__wrapper) {
    min-height: 44px;
  }

  .settings-scroll {
    padding: 18px 16px 24px;
  }

  .settings-category-heading {
    margin-bottom: 18px;
  }

  .settings-category-heading p {
    font-size: 16px;
  }

  .settings-form :deep(.el-form-item__label) {
    font-size: 16px;
  }

  .settings-form :deep(.el-input__inner),
  .settings-form :deep(.el-select__input),
  .settings-form :deep(.el-textarea__inner) {
    font-size: 16px;
  }

  .settings-form :deep(.el-input__wrapper),
  .settings-form :deep(.el-select__wrapper),
  .settings-form :deep(.el-autocomplete .el-input__wrapper),
  .settings-form :deep(.el-input-number),
  .settings-form :deep(.el-input-number .el-input__wrapper) {
    min-height: 44px;
  }

  .settings-form :deep(.el-checkbox),
  .settings-form :deep(.el-button) {
    min-height: 44px;
  }

  .settings-form :deep(.el-button.is-circle) {
    min-width: 44px;
  }

  .notice-enabled-checkbox,
  .settings-list-control .el-button {
    min-height: 44px;
  }

  .settings-list-control .el-button {
    min-width: 44px;
  }

  .settings-savebar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 16px max(10px, env(safe-area-inset-bottom));
  }

  .settings-save-status {
    flex: 1 1 100%;
    font-size: 14px;
  }

  .settings-save-actions {
    width: 100%;
  }

  .settings-save-actions :deep(.el-button) {
    flex: 1;
    min-height: 44px;
    margin-inline-start: 0;
  }
}
</style>
