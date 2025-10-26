import { createRouter, createWebHistory } from 'vue-router'
import { defineComponent, h } from 'vue' // Import defineComponent and h
import HomePage from '../views/Home.vue'
import PostDetail from '../views/PostDetail.vue'
import LoginPage from '../views/Login.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import PostForm from '../views/PostForm.vue'
import axios from 'axios'

// Helper function to create a dynamic component from template and script strings
const createDynamicComponent = (template, script) => {
  let componentOptions = {};
  try {
    const scriptFn = new Function('exports', 'require', 'module', script);
    const scriptExports = {};
    scriptFn(scriptExports, null, { exports: scriptExports });
    componentOptions = scriptExports.default || scriptExports;
  } catch (e) {
    console.error('Error evaluating dynamic component script:', e);
    return defineComponent({
      render: () => h('div', { style: { color: 'red' } }, 'Error loading component')
    });
  }

  return defineComponent({
    ...componentOptions,
    template: template,
    render: componentOptions.render || function() {
      try {
        return h('div', { innerHTML: template });
      } catch (e) {
        console.error('Error rendering dynamic component template:', e);
        return h('div', { style: { color: 'red' } }, 'Error rendering component');
      }
    }
  });
};

let staticRoutes = [
  {
    path: '/',
    name: 'HomePage',
    component: HomePage
  },
  {
    path: '/posts/:id',
    name: 'PostDetail',
    component: PostDetail,
    props: true
  },
  {
    path: '/login',
    name: 'LoginPage',
    component: LoginPage
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/posts/new',
    name: 'NewPost',
    component: PostForm,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/posts/edit/:id',
    name: 'EditPost',
    component: PostForm,
    props: true,
    meta: { requiresAuth: true, requiresAdmin: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes: staticRoutes // Use staticRoutes initially
});

let dynamicRoutesLoaded = false;
let dynamicRoutesLoading = false;

const loadDynamicRoutes = async () => {
  if (dynamicRoutesLoaded) return;

  const loggedIn = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (loggedIn && user && user.role === 'admin') {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/admin/dynamic-pages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dynamicPages = response.data.data;

      const newRoutesToAdd = [];

      dynamicPages.forEach(page => {
        const dynamicComponent = createDynamicComponent(page.componentTemplate, page.componentScript);
        if (page.overridesRouteName) {
          // Find and override existing static route
          const targetRoute = staticRoutes.find(r => r.name === page.overridesRouteName);
          if (targetRoute) {
            targetRoute.component = dynamicComponent;
            targetRoute.meta = { requiresAuth: page.requiresAuth === 1, requiresAdmin: page.requiresAdmin === 1 };
            console.log(`Overrode route: ${page.overridesRouteName}`);
          } else {
            console.warn(`Attempted to override non-existent route: ${page.overridesRouteName}`);
          }
        } else {
          // Add as a new dynamic route
          newRoutesToAdd.push({
            path: page.path,
            name: page.name,
            component: dynamicComponent,
            meta: { requiresAuth: page.requiresAuth === 1, requiresAdmin: page.requiresAdmin === 1 }
          });
        }
      });

      // Re-create router with potentially overridden static routes
      // This is a workaround as router.addRoute cannot override existing routes by name directly
      // A more robust solution might involve a custom router plugin or a different state management for routes
      router.removeRoute('HomePage'); // Remove existing static routes before re-adding
      router.removeRoute('PostDetail');
      router.removeRoute('LoginPage');
      router.removeRoute('AdminDashboard');
      router.removeRoute('NewPost');
      router.removeRoute('EditPost');

      staticRoutes.forEach(route => router.addRoute(route));
      newRoutesToAdd.forEach(route => router.addRoute(route));

    } catch (error) {
      console.error('Error fetching or adding dynamic routes:', error);
    }
  }
  dynamicRoutesLoaded = true; // Set to true after attempt, regardless of admin status or errors
};

router.beforeEach(async (to, from, next) => {
  const loggedIn = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (to.matched.some(record => record.meta.requiresAuth) && !loggedIn) {
    next('/login');
  } else if (to.matched.some(record => record.meta.requiresAdmin) && (!user || user.role !== 'admin')) {
    next('/'); // Redirect to home if not admin
  } else {
    if (!dynamicRoutesLoaded && !dynamicRoutesLoading) {
      dynamicRoutesLoading = true;
      try {
        await loadDynamicRoutes();
        // After loading dynamic routes, redirect to the target route to ensure it's resolved
        next({ ...to, replace: true });
      } catch (error) {
        console.error('Failed to load dynamic routes:', error);
        // If dynamic routes fail to load, redirect to home to prevent infinite loop
        next('/');
      } finally {
        dynamicRoutesLoading = false;
      }
    } else if (dynamicRoutesLoading) {
      // If dynamic routes are currently loading, wait for them to finish.
      // For simplicity, redirect to home if we are already loading and hit this guard again.
      next('/');
    } else {
      next(); // Routes are loaded, proceed
    }
  }
});

export default router
