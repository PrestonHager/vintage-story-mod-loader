import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Vintage Story Mod Loader',
  description: 'A comprehensive mod loader and manager for Vintage Story',
  base: '/vintage-story-mod-loader/',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'User Guide', link: '/user-guide' },
      { text: 'Designer Guide', link: '/designer-guide' },
      { text: 'FAQ', link: '/faq' }
    ],
    sidebar: {
      '/': [
        { text: 'Introduction', link: '/' },
        { text: 'User Guide', link: '/user-guide' },
        { text: 'Designer Guide', link: '/designer-guide' },
        { text: 'FAQ', link: '/faq' }
      ]
    }
  }
})

