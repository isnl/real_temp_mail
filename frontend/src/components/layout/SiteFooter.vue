<script setup lang="ts">
import BrandLogo from './BrandLogo.vue'
import { useSiteBranding } from '@/composables/useSiteBranding'
const { siteName, contactEmail } = useSiteBranding()
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer-content">
      <div class="site-footer-grid">
        <div class="site-footer-brand">
          <BrandLogo />
          <p>现代化临时邮箱服务，保护您的隐私，提供安全可靠的邮件接收体验。</p>
        </div>
        <nav aria-label="页脚导航">
          <h3>探索</h3>
          <router-link to="/">首页</router-link>
          <router-link to="/pricing">价格</router-link>
        </nav>
        <div v-if="contactEmail" class="site-footer-contact">
          <h3>联系我们</h3>
          <a :href="`mailto:${encodeURIComponent(contactEmail)}`">
            <font-awesome-icon icon="envelope" />
            <span>{{ contactEmail }}</span>
          </a>
        </div>
      </div>
      <div class="site-footer-copyright">
        &copy; {{ currentYear }} {{ siteName }}。保护隐私，安全可靠。
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  border-top: 1px solid var(--border);
  color: var(--text-secondary);
  background: var(--surface);
}
.site-footer-content {
  max-width: 1280px;
  margin: auto;
  padding: 44px 32px 24px;
}
.site-footer-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 32px 64px;
}
.site-footer-brand {
  flex: 1 1 300px;
  min-width: 0;
}
.site-footer-brand p {
  max-width: 400px;
  margin-top: 16px;
  font-size: 14px;
  line-height: 1.8;
}
.site-footer nav {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 100px;
}
.site-footer h3 {
  margin-bottom: 4px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}
.site-footer a {
  color: var(--text-secondary);
  font-size: 14px;
}
.site-footer a:hover {
  color: var(--brand-link);
}
.site-footer-contact {
  min-width: 0;
  max-width: 100%;
}
.site-footer-contact a {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}
.site-footer-contact svg {
  flex-shrink: 0;
}
.site-footer-contact span {
  overflow-wrap: anywhere;
}
.site-footer-copyright {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  overflow-wrap: anywhere;
}
@media (max-width: 700px) {
  .site-footer-content {
    padding: 32px 16px 24px;
  }
  .site-footer-grid {
    gap: 24px 32px;
  }
  .site-footer-brand {
    flex-basis: 100%;
  }
}
</style>
