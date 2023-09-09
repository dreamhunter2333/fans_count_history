<template>
    <n-spin description="loading..." :show="loading">
        <div class="main">
            <h3>哔哩哔哩 UP 粉丝数量监控 Admin</h3>
            <n-popconfirm @positive-click="crawler">
                <template #trigger>
                    <n-button>
                        爬取数据
                    </n-button>
                </template>
                <template #default>
                    爬取数据需要一定时间，请耐心等待
                </template>
            </n-popconfirm>
            <n-tabs type="segment" v-model:value="adminTab">
                <n-tab-pane name="pending" tab="待审批">
                    <n-data-table :columns="pendingColumn" :data="pendingData" :bordered="false" />
                </n-tab-pane>
                <n-tab-pane name="table" tab="已审核">
                    <n-data-table :columns="curColumn" :data="curData" :bordered="false" />
                </n-tab-pane>
            </n-tabs>
        </div>
        <n-modal v-model:show="showLogin" preset="dialog" title="Dialog">
            <template #header>
                <div>登录</div>
            </template>
            <n-input v-model:value="password" type="textarea" :autosize="{
                minRows: 3
            }" />
            <template #action>
                <n-button @click="login" size="small" tertiary round type="primary">
                    登录
                </n-button>
            </template>
        </n-modal>
    </n-spin>
</template>

<script setup>
import { use } from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { LegendComponent, GridComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import VChart, { THEME_KEY } from 'vue-echarts';
import { ref, onMounted, h } from 'vue';
import { NSelect, NTabs, NTabPane, NDataTable, NInput, NInputGroup, NButton } from 'naive-ui';
import { NSpin, NModal, NPopconfirm } from 'naive-ui';
import { useStorage } from '@vueuse/core'
import { useMessage } from 'naive-ui'

import { columns } from '../config/const.js';
const pendingColumn = [
    ...columns,
    {
        title: 'Action',
        key: 'actions',
        render(row) {
            return h('div', [
                h(NButton,
                    {
                        type: 'success',
                        onClick: () => approvePending(row.id)
                    },
                    { default: () => '审核' }
                ),
                h(NPopconfirm,
                    {
                        onPositiveClick: () => deletePending(row.id)
                    },
                    {
                        trigger: () => h(NButton, { type: "error" }, () => '删除'),
                        default: () => '确认删除？'
                    }
                )
            ])
        }
    }
]
const curColumn = [
    ...columns,
    {
        title: 'Action',
        key: 'actions',
        render(row) {
            return h('div', [
                h(NButton,
                    {
                        type: 'success',
                        onClick: () => crawlerThirdPart(row.id)
                    },
                    { default: () => '从第三方爬取数据' }
                ),
                h(NPopconfirm,
                    {
                        onPositiveClick: () => deleteAccount(row.id)
                    },
                    {
                        trigger: () => h(NButton, { type: "error" }, () => '删除'),
                        default: () => '确认删除？'
                    })
            ])
        }
    }
]
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
const loading = ref(false);
const showLogin = ref(false);
const password = ref("");
const jwt = useStorage('adminJWT', "");
const adminTab = useStorage('adminTab', 'pending');
const pendingData = ref([]);
const curData = ref([]);


const fetchData = async (path, method, body) => {
    const response = await fetch(`${API_BASE}${path}`, {
        method: method || "GET",
        body: body ? JSON.stringify(body) : null,
        headers: {
            "Authorization": `Bearer ${jwt.value}`,
            "Content-Type": "application/json"
        },
    });
    if (!response.ok) {
        if (response.status === 401) {
            jwt.value = "";
            showLogin.value = true;
            throw new Error("请登录");
        }
        throw new Error(`${response.status} ${await response.text()}` || "error");
    }
    return await response.json();
}

const refresh = async () => {
    loading.value = true;
    try {
        const pending_accounts = await fetchData("/admin/pending_accounts");
        pendingData.value = pending_accounts;
        const accounts = await fetchData("/admin/accounts");
        curData.value = accounts;
    } catch (e) {
        message.error(e.message || "error");
    } finally {
        loading.value = false;
    }
}

const crawler = async () => {
    loading.value = true;
    try {
        fetchData("/admin/crawler", "POST")
            .then(() => {
                message.success("开始爬取");
            }).then(() => {
                refresh();
            });
    } catch (e) {
        message.error(e.message || "error");
    } finally {
        loading.value = false;
    }
}

const deletePending = async (id) => {
    loading.value = true;
    try {
        await fetchData(`/admin/pending_accounts/${id}`, "DELETE")
        message.success("删除成功");
        refresh();
    } catch (e) {
        message.error(e.message || "error");
    } finally {
        loading.value = false;
    }
}

const approvePending = async (id) => {
    loading.value = true;
    try {
        await fetchData(`/admin/pending_accounts/${id}`, "POST")
        message.success("审核成功");
        refresh();
    } catch (e) {
        message.error(e.message || "error");
    } finally {
        loading.value = false;
    }
}

const deleteAccount = async (id) => {
    loading.value = true;
    try {
        await fetchData(`/admin/accounts/${id}`, "DELETE")
        message.success("删除成功");
        refresh();
    } catch (e) {
        message.error(e.message || "error");
    } finally {
        loading.value = false;
    }
}

const crawlerThirdPart = async (id) => {
    loading.value = true;
    try {
        await fetchData(`/admin/third_part_data/${id}`, "POST")
        message.success("爬取成功");
    } catch (e) {
        message.error(e.message || "error");
    } finally {
        loading.value = false;
    }
}

const login = async () => {
    jwt.value = password.value;
    showLogin.value = false;
    await refresh();
}

onMounted(async () => {
    await refresh();
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
