import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { vReveal } from './directives/reveal';
import './styles/index.scss';

const app = createApp(App);
app.directive('reveal', vReveal);
app.use(router);
app.mount('#app');
