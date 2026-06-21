import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/home', name: 'home', component: () => import('~/components/PageHome.vue') },
    {
      path: '/connect',
      name: 'connect',
      component: () => import('~/components/PageConnectInfoItems.vue'),
    },
    {
      path: '/custom-text/:category',
      name: 'custom-text',
      component: () => import('~/components/PageCustomText.vue'),
      props: true,
    },
    {
      path: '/mod',
      name: 'mod',
      children: [
        { path: 'js', name: 'mod-js', component: () => import('~/components/mod/PageJs.vue') },
        {
          path: 'reply',
          name: 'mod-reply',
          component: () => import('~/components/mod/PageCustomReply.vue'),
        },
        {
          path: 'deck',
          name: 'mod-deck',
          component: () => import('~/components/mod/PageMiscDeck.vue'),
        },
        {
          path: 'helpdoc',
          name: 'mod-helpdoc',
          component: () => import('~/components/mod/PageHelpDoc.vue'),
        },
        {
          path: 'story',
          name: 'mod-story',
          component: () => import('~/components/mod/PageStory.vue'),
        },
        {
          path: 'censor',
          name: 'mod-censor',
          component: () => import('~/components/mod/PageCensor.vue'),
        },
        {
          path: 'package',
          name: 'mod-package',
          component: () => import('~/components/mod/PagePackage.vue'),
        },
      ],
    },
    {
      path: '/tool',
      name: 'tool',
      children: [
        {
          path: 'test',
          name: 'tool-test',
          component: () => import('~/components/tool/PageTest.vue'),
        },
        {
          path: 'resource',
          name: 'tool-resource',
          component: () => import('~/components/tool/PageResource.vue'),
        },
        {
          path: 'ui-beautify',
          name: 'tool-ui-beautify',
          component: () => import('~/components/tool/PageUiBeautify.vue'),
        },
      ],
    },
    {
      path: '/misc',
      name: 'misc',
      children: [
        {
          path: 'base-setting',
          name: 'misc-base-setting',
          component: () => import('~/components/misc/PageMiscSettings.vue'),
        },
        {
          path: 'backup',
          name: 'misc-backup',
          component: () => import('~/components/misc/PageMiscBackup.vue'),
        },
        {
          path: 'group',
          name: 'misc-group',
          component: () => import('~/components/misc/PageMiscGroup.vue'),
        },
        {
          path: 'ban',
          name: 'misc-ban',
          component: () => import('~/components/misc/PageMiscBan.vue'),
        },
        {
          path: 'dice-public',
          name: 'misc-dice-public',
          component: () => import('~/components/misc/PageMiscDicePublic.vue'),
        },
        {
          path: 'advanced-setting',
          name: 'misc-advanced-setting',
          component: () => import('~/components/misc/PageMiscAdvancedSettings.vue'),
        },
      ],
    },
    { path: '/about', name: 'about', component: () => import('~/components/PageAbout.vue') },
    { path: '/:catchAll(.*)', name: 'default', redirect: { name: 'home' } },
  ],
});

export default router;
