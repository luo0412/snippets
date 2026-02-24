// modal-manager.js
// 命令式模态框管理器 - 独立文件
(function(window) {
  // 确保 Vue 已加载
  if (typeof Vue === 'undefined') {
    throw new Error('ModalManager 需要 Vue 2.x 环境，请先引入 Vue');
  }

  // ========== 模态框管理器核心实现 ==========
  const ModalManager = {
    // 存储模态框实例
    modals: new Map(),
    // 缓存组件构造器
    constructorCache: new Map(),
    // 已注册的普通组件
    registeredComponents: new Map(),
    // 懒加载组件加载器
    lazyComponentLoaders: new Map(),
    // 已加载的懒组件缓存
    lazyComponentCache: new Map(),

    // 生成唯一ID
    generateId() {
      return `modal_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    },

    // 注册普通组件（立即加载）
    registerComponent(name, component) {
      this.registeredComponents.set(name, component);
      console.log(`[ModalManager] 组件 ${name} 已注册`);
    },

    // 注册懒加载组件（调用时加载）
    registerLazyComponent(name, loader) {
      if (typeof loader !== 'function') {
        throw new Error('懒加载组件的loader必须是返回Promise的函数');
      }
      this.lazyComponentLoaders.set(name, loader);
      console.log(`[ModalManager] 懒加载组件 ${name} 已注册加载器`);
    },

    // 加载懒组件（内部使用）
    async loadLazyComponent(name) {
      // 检查缓存
      if (this.lazyComponentCache.has(name)) {
        return this.lazyComponentCache.get(name);
      }
      
      // 检查加载器
      const loader = this.lazyComponentLoaders.get(name);
      if (!loader) {
        throw new Error(`[ModalManager] 未找到名为 "${name}" 的懒加载组件加载器`);
      }
      
      // 执行加载器
      try {
        const component = await loader();
        // 缓存加载结果
        this.lazyComponentCache.set(name, component);
        console.log(`[ModalManager] 懒加载组件 ${name} 已加载并缓存`);
        return component;
      } catch (error) {
        console.error(`[ModalManager] 加载懒组件 ${name} 失败:`, error);
        throw new Error(`加载组件 ${name} 失败: ${error.message}`);
      }
    },

    // 获取组件（支持对象、字符串组件名、懒加载组件）
    async getComponent(componentOrName) {
      // 如果是组件对象，直接返回
      if (typeof componentOrName === 'object' && componentOrName.template) {
        return componentOrName;
      }
      
      // 如果是字符串，先查普通组件，再查懒加载组件
      if (typeof componentOrName === 'string') {
        const name = componentOrName;
        
        // 1. 检查普通组件
        if (this.registeredComponents.has(name)) {
          return this.registeredComponents.get(name);
        }
        
        // 2. 检查懒加载组件（异步加载）
        if (this.lazyComponentLoaders.has(name)) {
          return await this.loadLazyComponent(name);
        }
        
        // 3. 未找到
        throw new Error(`[ModalManager] 未找到名为 "${name}" 的组件`);
      }
      
      throw new Error('[ModalManager] 组件参数必须是组件对象或已注册的组件名称');
    },

    // ========== 核心 API - Promise 风格 ==========
    async openModal(componentOrName, config = {}) {
      // 异步获取组件（支持懒加载）
      const component = await this.getComponent(componentOrName);
      
      // 从config中提取modalKey和其他props
      const { modalKey, ...props } = config;
      
      // 防重复打开
      if (modalKey && this.modals.has(modalKey)) {
        const existingModal = this.modals.get(modalKey);
        console.warn(`[ModalManager] 模态框[${modalKey}]已打开，避免重复创建`);
        
        // 如果模态框被隐藏了，重新显示它
        if (existingModal.hidden) {
          this.showModal(modalKey);
        }
        
        return existingModal.promise;
      }

      return new Promise((resolve, reject) => {
        const modalId = modalKey || this.generateId();
        // 缓存构造器，提升性能
        let ModalConstructor = this.constructorCache.get(component);
        if (!ModalConstructor) {
          ModalConstructor = Vue.extend(component);
          this.constructorCache.set(component, ModalConstructor);
        }

        // 初始化组件实例
        const modalInstance = new ModalConstructor({
          el: document.createElement('div'),
          propsData: {
            ...props,
            modalId,
            resolve: (data) => {
              console.log('[ModalManager] Modal resolved:', data);
              resolve({ data, modalId });
              this.modals.delete(modalId);
            },
            reject: (data) => {
              console.log('[ModalManager] Modal rejected:', data);
              reject(data);
              this.modals.delete(modalId);
            }
          }
        });
        
        // 挂载模态框到页面
        this.mountModal(modalInstance);
        
        // 存储实例和对应的Promise
        this.modals.set(modalId, {
          instance: modalInstance,
          promise: Promise.resolve({ data: {}, modalId }),
          title: props.title || component.name || '未知模态框',
          hidden: false,
          type: 'normal'
        });
      });
    },

    // ========== 核心 API - Await-to-js 风格 ==========
    async toOpenModal(componentOrName, config = {}) {
      try {
        const result = await this.openModal(componentOrName, config);
        return [null, result]; // [error, result] 格式
      } catch (error) {
        return [error, null];
      }
    },

    // ========== 基础操作方法 ==========
    // 显示模态框
    showModal(modalId) {
      const modalItem = this.modals.get(modalId);
      if (!modalItem) {
        console.warn(`[ModalManager] 未找到要显示的模态框: ${modalId}`);
        return false;
      }
      
      modalItem.instance.visible = true;
      modalItem.hidden = false;
      return true;
    },

    // 隐藏模态框（仅隐藏，不销毁）
    hideModal(modalId) {
      const modalItem = this.modals.get(modalId);
      if (!modalItem) {
        console.warn(`[ModalManager] 未找到要隐藏的模态框: ${modalId}`);
        return false;
      }
      
      modalItem.instance.visible = false;
      modalItem.hidden = true;
      return true;
    },

    // 销毁模态框（完全销毁）
    destroyModal(modalId) {
      const modalItem = this.modals.get(modalId);
      if (!modalItem) {
        console.warn(`[ModalManager] 未找到要销毁的模态框: ${modalId}`);
        return false;
      }
      
      const { instance } = modalItem;
      instance.visible = false;

      // 延迟卸载，适配动画
      setTimeout(() => {
        try {
          if (instance.$el && instance.$el.parentNode) {
            document.body.removeChild(instance.$el);
          }
          instance.$off();
          instance.$destroy();
        } catch (e) {
          console.error('[ModalManager] 销毁模态框时出错:', e);
        } finally {
          this.modals.delete(modalId);
        }
      }, 300);
      
      return true;
    },

    // 关闭所有模态框
    closeAllModals() {
      const modalIds = Array.from(this.modals.keys());
      modalIds.forEach(id => this.destroyModal(id));
    },

    // 获取所有打开的模态框
    getOpenModals() {
      const openModals = [];
      this.modals.forEach((item, id) => {
        if (!item.hidden) {
          openModals.push({
            id,
            title: item.title,
            type: item.type
          });
        }
      });
      return openModals;
    },

    // 挂载模态框到body
    mountModal(modalInstance) {
      if (!modalInstance.$el || modalInstance.$el.parentNode) return;
      document.body.appendChild(modalInstance.$el);
      Vue.nextTick(() => {
        modalInstance.visible = true;
      });
    }
  };

  // 暴露到全局
  window.ModalManager = ModalManager;
  console.log('[ModalManager] 模态框管理器已初始化并挂载到全局');

})(window);