import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./assets/css/main.css";

// Initialize PWA
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");
