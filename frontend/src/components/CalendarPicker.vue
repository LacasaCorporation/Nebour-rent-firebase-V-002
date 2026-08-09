<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  blockedDates: { type: Array, default: () => [] },
  label: { type: String, default: 'Select Dates' },
  interactive: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'toggleDate'])

const currentMonth = ref(new Date().getMonth())
const currentYear = ref(new Date().getFullYear())

const manualStart = ref(props.modelValue?.start || '')
const manualEnd = ref(props.modelValue?.end || '')

watch(() => props.modelValue, (val) => {
  manualStart.value = val?.start || ''
  manualEnd.value = val?.end || ''
  if (val?.start) {
    const d = new Date(val.start)
    if (!isNaN(d.getTime())) {
      currentMonth.value = d.getMonth()
      currentYear.value = d.getFullYear()
    }
  }
}, { immediate: true, deep: true })

function onManualStartChange(e) {
  const newStart = e.target.value
  manualStart.value = newStart
  if (newStart) {
    const d = new Date(newStart)
    if (!isNaN(d.getTime())) {
      currentMonth.value = d.getMonth()
      currentYear.value = d.getFullYear()
    }
  }
  let end = manualEnd.value
  if (end && end < newStart) {
    end = ''
    manualEnd.value = ''
  }
  emit('update:modelValue', { start: newStart || null, end: end || null })
}

function onManualEndChange(e) {
  const newEnd = e.target.value
  manualEnd.value = newEnd
  let start = manualStart.value
  if (newEnd && start && newEnd < start) {
    start = newEnd
    manualStart.value = newEnd
    manualEnd.value = ''
  }
  emit('update:modelValue', { start: start || null, end: manualEnd.value || null })
}

function selectDate(dateStr) {
  if (props.interactive) {
    emit('toggleDate', { date: dateStr, block: !props.blockedDates?.includes(dateStr) })
    return
  }
  const curr = props.modelValue || {}
  if (!curr.start || (curr.start && curr.end)) {
    emit('update:modelValue', { start: dateStr, end: null })
  } else {
    if (dateStr < curr.start) {
      emit('update:modelValue', { start: dateStr, end: null })
    } else {
      emit('update:modelValue', { start: curr.start, end: dateStr })
    }
  }
}

function isSelected(dateStr) {
  const curr = props.modelValue || {}
  return dateStr === curr.start || dateStr === curr.end
}

function isInRange(dateStr) {
  const curr = props.modelValue || {}
  if (!curr.start || !curr.end) return false
  return dateStr > curr.start && dateStr < curr.end
}

function isStart(dateStr) {
  return dateStr === (props.modelValue?.start || null)
}

function isEnd(dateStr) {
  return dateStr === (props.modelValue?.end || null)
}

function isBlocked(dateStr) {
  return props.blockedDates?.includes(dateStr)
}

const daysInMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
})

const firstDayOfMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value, 1).getDay()
})

const monthName = computed(() => {
  return new Date(currentYear.value, currentMonth.value).toLocaleString('default', { month: 'long' })
})

function formatDate(year, month, day) {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const today = computed(() => {
  const d = new Date()
  return formatDate(d.getFullYear(), d.getMonth(), d.getDate())
})

function clearSelection() {
  manualStart.value = ''
  manualEnd.value = ''
  emit('update:modelValue', {})
}
</script>

<template>
  <div class="space-y-3">
    <!-- Header with Label and Clear -->
    <div class="flex items-center justify-between">
      <label class="block text-sm font-semibold text-warm-900 flex items-center gap-1.5">
        <svg class="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
        <span>{{ label }}</span>
      </label>

      <button
        type="button"
        v-if="modelValue?.start || manualStart"
        @click="clearSelection"
        class="text-xs font-semibold text-warm-500 hover:text-danger transition-colors cursor-pointer"
      >
        Clear Dates
      </button>
    </div>

    <!-- Manual Start & End Date Entry Inputs -->
    <div v-if="!interactive" class="grid grid-cols-2 gap-3 p-3 bg-warm-50/80 rounded-2xl border border-warm-200/90 shadow-2xs">
      <div>
        <label class="block text-[11px] font-bold text-warm-600 uppercase tracking-wider mb-1">
          Start Date
        </label>
        <div class="relative">
          <input
            type="date"
            :value="manualStart"
            @input="onManualStartChange"
            class="w-full px-3 py-2 bg-white rounded-xl border border-warm-200 text-xs font-semibold text-warm-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all cursor-pointer"
          />
        </div>
      </div>

      <div>
        <label class="block text-[11px] font-bold text-warm-600 uppercase tracking-wider mb-1">
          End Date
        </label>
        <div class="relative">
          <input
            type="date"
            :value="manualEnd"
            :min="manualStart || undefined"
            @input="onManualEndChange"
            class="w-full px-3 py-2 bg-white rounded-xl border border-warm-200 text-xs font-semibold text-warm-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all cursor-pointer"
          />
        </div>
      </div>
    </div>

    <!-- Visual Interactive Calendar Picker -->
    <div class="bg-white/90 backdrop-blur-sm rounded-2xl border border-warm-200/90 p-4 shadow-2xs">
      <!-- Month Header -->
      <div class="flex items-center justify-between mb-3">
        <button
          type="button"
          @click="prevMonth"
          class="p-1.5 rounded-lg hover:bg-warm-100 transition-colors text-warm-600 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span class="text-xs font-extrabold text-warm-900 uppercase tracking-wider">{{ monthName }} {{ currentYear }}</span>
        <button
          type="button"
          @click="nextMonth"
          class="p-1.5 rounded-lg hover:bg-warm-100 transition-colors text-warm-600 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      <!-- Day Names -->
      <div class="grid grid-cols-7 gap-1 mb-1">
        <div
          v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
          :key="day"
          class="text-center text-[10px] font-bold text-warm-400 uppercase py-1"
        >
          {{ day }}
        </div>
      </div>

      <!-- Calendar Grid -->
      <div class="grid grid-cols-7 gap-1">
        <div
          v-for="blank in firstDayOfMonth"
          :key="'blank-' + blank"
          class="text-center py-1"
        />

        <button
          type="button"
          v-for="day in daysInMonth"
          :key="day"
          :disabled="!interactive && isBlocked(formatDate(currentYear, currentMonth, day))"
          @click="selectDate(formatDate(currentYear, currentMonth, day))"
          class="relative text-center py-2 text-xs font-semibold rounded-xl transition-all"
          :class="[
            isBlocked(formatDate(currentYear, currentMonth, day))
              ? interactive
                ? 'bg-danger/10 text-danger line-through cursor-pointer hover:bg-danger/20'
                : 'text-warm-300 line-through cursor-not-allowed bg-warm-50'
              : interactive
                ? 'text-warm-700 hover:bg-warm-100 cursor-pointer'
                : isStart(formatDate(currentYear, currentMonth, day)) || isEnd(formatDate(currentYear, currentMonth, day))
                  ? 'bg-brand-600 text-white font-bold shadow-xs'
                  : isInRange(formatDate(currentYear, currentMonth, day))
                    ? 'bg-brand-50 text-brand-700 font-bold'
                    : isSelected(formatDate(currentYear, currentMonth, day))
                      ? 'bg-brand-600 text-white font-bold shadow-xs'
                      : 'text-warm-800 hover:bg-brand-50 hover:text-brand-600 cursor-pointer',
            formatDate(currentYear, currentMonth, day) === today && !isSelected(formatDate(currentYear, currentMonth, day))
              ? 'ring-1 ring-brand-400 font-bold'
              : '',
          ]"
        >
          {{ day }}
        </button>
      </div>

      <!-- Selection Info -->
      <div v-if="modelValue?.start || manualStart" class="mt-3 pt-2.5 border-t border-warm-100 text-xs text-warm-600 flex items-center justify-between">
        <span v-if="(modelValue?.start || manualStart) && !(modelValue?.end || manualEnd)">
          Selected Start: <strong class="text-brand-700 font-bold">{{ modelValue?.start || manualStart }}</strong>
          <span class="text-warm-400 italic font-normal ml-1">(choose end date)</span>
        </span>
        <span v-else-if="(modelValue?.start || manualStart) && (modelValue?.end || manualEnd)">
          Selected Range: <strong class="text-brand-700 font-bold">{{ modelValue?.start || manualStart }}</strong> → <strong class="text-brand-700 font-bold">{{ modelValue?.end || manualEnd }}</strong>
        </span>
      </div>
    </div>
  </div>
</template>

