<template>
  <n-spin description="loading..." :show="loading">
    <div class="main">
      <h3>哔哩哔哩 UP 粉丝数量监控</h3>
      <n-input-group>
        <n-select v-if="chartType !== 'table'" v-model:value="selected" multiple :options="selectOptions"
          placeholder="请选择需要查看的 UP" />
        <n-select v-else v-model:value="selectedForTable" :options="selectOptions" placeholder="请选择需要查看的 UP" />
        <n-button @click="showModal = true" tertiary type="primary">提交新 UP</n-button>
      </n-input-group>
      <n-tabs type="segment" v-model:value="chartType">
        <n-tab-pane name="line" tab="折线图">
          <v-chart :key="chartKey" :option="option" autoresize />
        </n-tab-pane>
        <n-tab-pane name="bar" tab="动态图">
          <v-chart :key="chartKey" :option="option_bar" autoresize />
        </n-tab-pane>
        <n-tab-pane name="table" tab="表格">
          <n-data-table :columns="columns" :data="tableData" :bordered="false" />
        </n-tab-pane>
      </n-tabs>
      <n-modal v-model:show="showModal" preset="dialog" title="Dialog">
        <template #header>
          <div>提交新 UP 主</div>
        </template>
        <n-input v-model:value="newUID" placeholder="请输入 UID" />
        <template #action>
          <n-button @click="submitNewUP" size="small" tertiary round type="primary">
            提交
          </n-button>
        </template>
      </n-modal>
    </div>
  </n-spin>
</template>

<script setup>
import { use } from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { LegendComponent, GridComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import VChart, { THEME_KEY } from 'vue-echarts';
import { ref, provide, onMounted, watch } from 'vue';
import { NSelect, NTabs, NTabPane, NDataTable, NInput, NInputGroup, NButton } from 'naive-ui';
import { NSpin, NModal } from 'naive-ui';
import { useStorage } from '@vueuse/core'
import { useMessage } from 'naive-ui'

const API_BASE = import.meta.env.VITE_API_BASE || "";

use([
  LegendComponent,
  TitleComponent,
  GridComponent,
  TooltipComponent,
  LineChart,
  BarChart,
  CanvasRenderer
])
const message = useMessage();
// provide(THEME_KEY, 'dark');
const loading = ref(false);
const showModal = ref(false);
const newUID = ref("");
const dates_ref = ref([]);
const series_ref = ref([]);
const selected = useStorage('selected', [])
const selectedForTable = useStorage('selectedForTable', null)
const selectOptions = ref([]);
const chartType = useStorage('chartType', 'line');
const columns = [
  {
    title: "日期",
    key: "date"
  },
  {
    title: "数量",
    key: "fans"
  },
  {
    title: "数量变化",
    key: "delta"
  }
]
const tableData = ref([]);

const option = ref({
  tooltip: {
    trigger: 'axis',
    confine: true,
    order: 'valueDesc'
  },
  legend: {
    type: 'scroll',
    orient: 'vertical',
    right: 10,
    top: 20,
    bottom: 20,
    selected: {},
    selectedMode: false,
  },
  xAxis: {
    type: 'category',
    data: []
  },
  yAxis: {
    type: 'value',
    max: (value) => Math.ceil(value.max / 1000 * 1.1) * 1000,
    min: (value) => Math.floor(value.min / 1000 * 0.9) * 1000,
  },
  series: []
});

const option_bar = ref({
  xAxis: {
    max: 'dataMax'
  },
  yAxis: {
    type: 'category',
    data: {},
    inverse: true,
    animationDuration: 300,
    animationDurationUpdate: 300,
    // max: 2 // only the largest 3 bars will be displayed
  },
  series: [
    {
      realtimeSort: true,
      name: 'Fans',
      type: 'bar',
      data: [],
      label: {
        show: true,
        position: 'right',
        valueAnimation: true
      },
      itemStyle: {
        normal: {
          color: function () { return "#" + Math.floor(Math.random() * (256 * 256 * 256 - 1)).toString(16); }
        },
      }
    }
  ],
  legend: {
    show: true
  },
  animationDuration: 3000,
  animationDurationUpdate: 3000,
  animationEasing: 'linear',
  animationEasingUpdate: 'linear'
});

const fetchData = async () => {
  const response = await fetch(`${API_BASE}/api/line_chart`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}` || "error");
  }
  let res = await response.json();
  const { dates, series } = res;
  dates_ref.value = dates;
  series_ref.value = series;
  option.value.xAxis.data = dates;
  option.value.series = series.map((s) => ({
    name: s.name,
    data: s.data,
    connectNulls: true,
    type: 'line'
  }));
  option_bar.value.yAxis.data = series.map((s) => s.name);
  selectOptions.value = series.map((s) => ({ label: s.name, value: s.name }));
}
const refresh = async () => {
  loading.value = true;
  try {
    await fetchData();
  } catch (e) {
    message.error(e.message || "error");
  } finally {
    loading.value = false;
  }
}

const submitNewUP = async () => {
  if (!newUID.value) {
    message.error("UID 不能为空");
    return;
  }
  loading.value = true;
  try {
    const response = await fetch(`${API_BASE}/api/bilibili`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        uid: newUID.value
      })
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${await response.text()}` || "error");
    }
    let res = await response.json();
    const { name } = res;
    message.success(`成功添加 UP 主 ${name}, 请等待审核后数据更新`, {
      keepAliveOnHover: true
    });
    showModal.value = false;
  } catch (e) {
    message.error(e.message || "error");
  } finally {
    loading.value = false;
  }
}

const bar_index = ref(0);
const timeoutId = ref(null);

const update_bar_chart = () => {
  if (bar_index.value >= dates_ref.value.length) {
    return;
  }
  option_bar.value.series[0].data = series_ref.value
    .filter((s) => option_bar.value.yAxis.data.includes(s.name))
    .map((s) => s.data[bar_index.value]);
  option_bar.value.series[0].name = dates_ref.value[bar_index.value];
  bar_index.value += 1;
  timeoutId.value = setTimeout(update_bar_chart, 1000);
}

const chartKey = ref(0);

const updateChartData = (newVal) => {
  chartKey.value += 1;
  if (timeoutId.value) {
    clearTimeout(timeoutId.value);
  }
  bar_index.value = 0;
  if (newVal.length === 0) {
    option.value.series = series_ref.value.map((s) => ({
      name: s.name,
      data: s.data,
      connectNulls: true,
      type: 'line'
    }));
    option_bar.value.yAxis.data = series_ref.value.map((s) => s.name);
  } else {
    option_bar.value.yAxis.data = series_ref.value.reduce((acc, cur) => {
      if (newVal.includes(cur.name)) {
        acc.push(cur.name);
      }
      return acc;
    }, []);
    option.value.series = series_ref.value.filter(
      (s) => newVal.includes(s.name)
    ).map((s) => ({
      name: s.name,
      data: s.data,
      connectNulls: true,
      type: 'line'
    }));
  }
  update_bar_chart();
}

watch(selected, (newVal) => updateChartData(newVal));

const updateTableDate = (newVal) => {
  if (!newVal) {
    tableData.value = [];
    return;
  }
  const index = series_ref.value.findIndex((s) => s.name == newVal);
  if (index === -1) {
    tableData.value = [];
    return;
  }
  tableData.value = dates_ref.value.map((date, i) => ({
    date: date,
    fans: series_ref.value[index].data[i],
    delta: (
      i === 0 || !series_ref.value[index].data[i - 1]
    ) ? undefined : series_ref.value[index].data[i] - series_ref.value[index].data[i - 1]
  })).filter(
    (d) => d.fans !== null
  ).reverse();
}

watch(selectedForTable, (newVal) => updateTableDate(newVal));

onMounted(async () => {
  await refresh();
  updateChartData(selected.value);
  updateTableDate(selectedForTable.value);
});
</script>

<style scoped>
.main {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

.n-input-group {
  width: 80%;
}

.n-tabs {
  width: 80%;
}

.n-tab-pane {
  height: 75vh;
}
</style>
