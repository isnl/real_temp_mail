<script setup lang="ts" generic="Row">
import { useMediaQuery } from '@vueuse/core'

type Action = {
  label: string
  run: () => unknown
  danger?: boolean
  disabled?: boolean
}

withDefaults(
  defineProps<{
    actions: (row: Row) => Action[]
    rowLabel: (row: Row) => string
    width?: number
  }>(),
  { width: 200 },
)
const compact = useMediaQuery('(max-width: 1100px)')
</script>

<template>
  <el-table-column
    label="操作"
    :width="compact ? 64 : width"
    fixed="right"
    :class-name="compact ? 'admin-actions-cell' : undefined"
  >
    <template #default="{ row }">
      <el-dropdown
        v-if="compact"
        trigger="click"
        placement="bottom-end"
        popper-class="admin-actions-menu"
        @command="(index: number) => actions(row)[index]?.run()"
      >
        <button type="button" class="admin-more-button" :aria-label="`更多操作：${rowLabel(row)}`">
          <font-awesome-icon icon="ellipsis" />
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="(action, index) in actions(row)"
              :key="action.label"
              :command="index"
              :disabled="action.disabled"
              :class="{ 'is-danger': action.danger }"
              >{{ action.label }}</el-dropdown-item
            >
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <div v-else class="admin-row-actions">
        <el-button
          v-for="action in actions(row)"
          :key="action.label"
          link
          class="admin-row-action"
          :type="action.danger ? 'danger' : 'primary'"
          size="small"
          :disabled="action.disabled"
          @click="action.run()"
          >{{ action.label }}</el-button
        >
      </div>
    </template>
  </el-table-column>
</template>
