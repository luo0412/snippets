<template>
  <a-collapse
    v-model="activeKey"
    class="w-full"
    accordion
    :bordered="false"
    :destroy-inactive-panel="true"
    expand-icon-position="right"
    @change="onCollapseChange"
  >
    <a-collapse-panel
      v-for="item in firstLevelData"
      :key="item.key"
      :header="item.title"
    >
      <a-tree
        v-if="item.isLeaf === false && item.children && item.children.length > 0"
        style="min-height: 50px;width: 100%;"
        :tree-data="item.children"
        :load-data="loadTreeData"
        :field-names="{ title: 'title', key: 'key', children: 'children' }"
        :default-expand-all="false"
        :default-expanded-keys="[]"
        :show-icon="false"
        @select="onSelect"
        @expand="onExpand"
      >
        <template #title="{ title }">
          <slot v-if="$slots.title || $scopedSlots.title" name="title"></slot>
          <div v-else class="cursor-pointer" style="width: calc(300px - 60px - 25px);">
            <auto-tooltip :text="title" />
          </div>
        </template>
        <template #switcherIcon>
          <div class="cursor-pointer" style="width: calc(300px - 60px - 25px);height: 100%;transform: unset;"></div>
        </template>
      </a-tree>
      <a-spin
        v-else-if="item.isLeaf === false"
        spinning
        class="w-full p-10"
      />
      <div v-else>{{ item.title }}</div>
    </a-collapse-panel>
  </a-collapse>
</template>

<script>
export default {
  name: 'DeviceCollapseTree',
  props: {
    firstLevelApi: {
      type: Function,
      default: () =>
        new Promise((resolve) => {
          resolve();
        }),
      required: true,
    },
    codeKeys: {
      type: Array,
      default: () => [
        'id',
        'code',
        'singleProjectCode',
        'buildUnitCode',
        'provinceCode',
      ],
    },
    titleKeys: {
      type: Array,
      default: () => [
        'name',
        'singleProjectName',
        'buildUnitName',
        'provinceName',
      ],
    },
    secondLevelApi: {
      type: Function,
      default: () =>
        new Promise((resolve) => {
          resolve();
        }),
    },
    thirdLevelApi: {
      type: Function,
      default: () =>
        new Promise((resolve) => {
          resolve();
        }),
    },
    maxLevel: {
      type: Number,
      default: 3,
    },
  },
  data() {
    return {
      activeKey: [],
      firstLevelData: [],
      selectedKeys: [],
    };
  },
  async mounted() {
    console.log('🚀 ~ mounted ~ this.$slots, this.$slots, this.$scopedSlots');
    await this.loadFirstLevelData();
  },
  methods: {
    getTreeTitleMaybe(item) {
      for (const key of this.titleKeys) {
        const val = item[key];
        if (![undefined, null, ''].includes(val)) {
          return val;
        }
      }
      return undefined;
    },
    getTreeCodeMaybe(item) {
      for (const key of this.codeKeys) {
        const val = item[key];
        if (![undefined, null, ''].includes(val)) {
          return val;
        }
      }
      return undefined;
    },
    async loadFirstLevelData() {
      try {
        const result = await this.firstLevelApi();
        this.firstLevelData = result.data?.map((item) => ({
          ...item,
          key: this.getTreeCodeMaybe(item),
          title: this.getTreeTitleMaybe(item),
          isLeaf: this.maxLevel <= 1,
          children: this.maxLevel > 1 ? item.children || [] : null,
        }));
      } catch (error) {
        console.error('Failed to load first level data:', error);
      }
    },
    async loadTreeData(treeNode) {
      if (treeNode.dataRef.children && treeNode.dataRef.children.length > 0) {
        return;
      }
      try {
        const result = await this.thirdLevelApi({
          buildUnitCode: treeNode.dataRef.key,
        });
        const children =
          result.data?.length > 0
            ? result.data?.map((item) => ({
                ...item,
                key: item.id || item.singleProjectCode,
                title: item.name || item.singleProjectName,
                isLeaf: this.maxLevel <= 3,
                // children: null,
                children: item.level > 3 ? item.children || [] : null,
              }))
            : null;
        this.$nextTick(() => {
          treeNode.dataRef.children = children;
        });
      } catch (error) {
        console.error('Failed to load tree data:', error);
      }
    },
    async onCollapseChange(activeKey) {
      if (!activeKey) {
        return;
      }
      // this.activeKey = activeKey.length > 0 ? activeKey[0] : null;
      this.activeKey = activeKey;
      const matchCollapse = this.firstLevelData.find(
        (it) => it.key === activeKey
      );
      if (matchCollapse && matchCollapse.children?.length > 0) {
        return;
      }
      const result = await this.secondLevelApi({
        provinceCode: activeKey,
      });
      const children = result.data?.map((item) => ({
        ...item,
        key: item.id || item.buildUnitCode,
        title: item.name || item.buildUnitName,
        isLeaf: this.maxLevel <= 2,
        children: this.maxLevel > 2 ? item.children || [] : null,
      }));
      matchCollapse.children = children;
    },
    onSelect(selectedKeys, info) {
      // info.node.expanded = !info.node.expanded
      // this.$set(info.node, 'expanded', !info.node.expanded)
      // this.loadTreeData(info.node)
      this.selectedKeys = selectedKeys;
      this.$emit(
        'select',
        selectedKeys?.length > 0 ? selectedKeys[0] : this.getTreeCodeMaybe(info?.node?.dataRef || {}),
        info?.node?.dataRef
      );
    },
    onExpand(expandedKeys, info) {
      this.onSelect(expandedKeys, info);
      this.$emit('expand', expandedKeys, info?.node?.dataRef);
    },
  },
};
</script>

<style lang="less" scoped>
/deep/ .ant-collapse-content-box {
  padding: 0 10px 0 0px !important;
}

/deep/ .ant-tree {
  border-left: 3px solid #def2f4;
  margin-left: 8px;
  margin-top: 10px;
  margin-bottom: 10px;
  padding-left: 10px;
}

/deep/ .ant-tree li ul {
  max-height: 300px;
  overflow-y: auto;
  position: relative;
  border-left: 3px solid #def2f4;
  margin-left: 8px;
  margin-top: 10px;
  margin-bottom: 10px;
  padding-left: 10px;
}

/deep/ .ant-collapse-header {
  background: rgba(40, 182, 180, .05);
  border-radius: 10px;
  padding: 0 12px;
  cursor: pointer;
  font-size: 14px;
  color: #154772;
}

/deep/ .ant-collapse-item-active .ant-collapse-header {
  background-image: linear-gradient(90deg, #08d2be, #4dacfe);
  color: #fff;
}

.ant-collapse-borderless > .ant-collapse-item {
  cursor: pointer;
  border-bottom: unset;
  &:not(:last-child) {
    margin-bottom: 10px;
  }
}

/deep/ .ant-tree-title {
  cursor: pointer;
}

/deep/ .ant-tree li span.ant-tree-switcher,
/deep/ .ant-tree li span.ant-tree-iconEle {
  opacity: 0;
  width: 0;
}

/deep/ .ant-tree li span.ant-tree-switcher.ant-tree-switcher-noop {
  display: none;
}

/deep/ .ant-tree li .ant-tree-node-content-wrapper.ant-tree-node-selected {
  background: unset;
}

/deep/ .ant-tree > li:first-child {
  padding-top: 0;
}

/deep/ .ant-tree-child-tree > li:first-child {
  padding-top: 0;
}
</style>