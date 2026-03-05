<template>
  <div class="page">
    <a-space>
      <a-button type="primary" @click="visible = true">自定义按钮</a-button>
      <el-button type="primary" @click="visible = true">按钮</el-button>
      <el-date-picker placeholder="请选择日期" v-model="date" />
    </a-space>
    <a-modal v-model:visible="visible" title="Hello world">
      <p>Try Ant Design Vue</p>
    </a-modal>
  </div>
</template>

<script>
export default {
  data() {
    return {
      date: null,
      visible: false
    }
  }
}
</script>

<style>
.page {
  padding: 20px;
}
</style>