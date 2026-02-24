// modal-components.js
(function(window) {
  if (typeof ModalManager === 'undefined') {
    throw new Error('请先引入 modal-manager.js');
  }

  // 注册 CustomModal（移除JSX，改用纯模板语法）
  ModalManager.registerLazyComponent('CustomModal', () => {
    return Promise.resolve({
      props: {
        title: { type: String, default: '自定义模态框' },
        visible: { type: Boolean, default: false },
        modalId: { type: String, default: '' },
        resolve: { type: Function, required: true },
        reject: { type: Function, required: true },
        initValue: { type: String, default: '' },
        allowHide: { type: Boolean, default: false }
      },
      template: `
        <a-modal
          :title="title"
          :visible="visible"
          :maskClosable="false"
          :closable="!allowHide"
          width="450px"
          @cancel="handleCancel"
        >
          <!-- 模态框内容 -->
          <div>这是支持<b>隐藏/显示</b>的模态框（ID：{{modalId}}）</div>
          <div v-if="allowHide" style="color: #f50; margin: 10px 0;">
            💡 提示：点击「仅隐藏」按钮测试隐藏功能，模态框不会销毁
          </div>
          <a-input 
            v-model="inputValue" 
            :placeholder="\`初始值：\${initValue}，请输入内容\`" 
            style="margin-top: 10px;"
          />

          <!-- 自定义底部按钮（使用Vue的slot语法，替代JSX） -->
          <template slot="footer">
            <!-- 仅隐藏按钮 -->
            <a-button v-if="allowHide" type="dashed" @click="handleHide">
              仅隐藏（不销毁）
            </a-button>
            <!-- 取消按钮 -->
            <a-button @click="handleCancel">
              取消（销毁）
            </a-button>
            <!-- 确认按钮 -->
            <a-button type="primary" @click="handleConfirm">
              确认（销毁）
            </a-button>
          </template>
        </a-modal>
      `,
      data() {
        return { 
          inputValue: this.initValue 
        };
      },
      methods: {
        // 仅隐藏（不销毁）
        handleHide() {
          this.visible = false;
          this.$message.info(`模态框 ${this.modalId} 已隐藏（未销毁）`);
        },
        
        // 取消（销毁）
        handleCancel() {
          this.visible = false;
          this.reject({ 
            reason: '用户取消', 
            modalId: this.modalId,
            isCanceled: true
          });
          ModalManager.destroyModal(this.modalId);
        },
        
        // 确认（销毁）
        handleConfirm() {
          this.visible = false;
          this.resolve({ 
            inputValue: this.inputValue, 
            modalId: this.modalId,
            time: new Date().getTime()
          });
          ModalManager.destroyModal(this.modalId);
        }
      }
    });
  });

  // 注册 ConfirmModal（保持不变）
  ModalManager.registerLazyComponent('ConfirmModal', () => {
    return Promise.resolve({
      props: {
        message: { type: String, default: '确定要执行此操作吗？' },
        visible: { type: Boolean, default: false },
        modalId: { type: String, default: '' },
        resolve: { type: Function, required: true },
        reject: { type: Function, required: true }
      },
      template: `
        <a-modal
          title="确认操作"
          :visible="visible"
          :maskClosable="false"
          width="300px"
          @cancel="handleCancel"
          @ok="handleConfirm"
        >
          <div style="color: #666;">{{ message }}</div>
        </a-modal>
      `,
      methods: {
        handleCancel() {
          this.visible = false;
          this.reject({ 
            reason: '用户取消操作', 
            modalId: this.modalId,
            isCanceled: true
          });
          ModalManager.destroyModal(this.modalId);
        },
        handleConfirm() {
          this.visible = false;
          this.resolve({ confirmed: true, modalId: this.modalId });
          ModalManager.destroyModal(this.modalId);
        }
      }
    });
  });

  console.log('[ModalComponents] 模态框组件已注册（纯模板语法，无JSX）');

})(window);