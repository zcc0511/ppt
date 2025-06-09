<template>
  <div class="timeline-editor-panel">
    <h3>Animation Timeline</h3>
    <div class="timeline-controls">
      <button @click="zoomIn">Zoom In</button>
      <button @click="zoomOut">Zoom Out</button>
      <span>Scale: {{ scale }} px/s</span>
    </div>
    <div class="timeline-grid" ref="timelineGridRef">
      <div
        v-for="animation in currentAnimations"
        :key="animation.id"
        class="timeline-animation-item"
        :style="getAnimationStyle(animation)"
        @mousedown="onDragStart(animation, $event)"
      >
        {{ getElementShortName(animation.elId) }} - {{ animation.effect }} ({{ animation.startTime || 0 }}ms - {{ (animation.startTime || 0) + animation.duration }}ms)
      </div>
    </div>
    <div class="timeline-axis">
      <!-- Axis markers will be generated here -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store/slides'
import { useMainStore } from '@/store/main'
import type { PPTAnimation } from '@/types/slides'
import { ENTER_ANIMATIONS, EXIT_ANIMATIONS, ATTENTION_ANIMATIONS } from '@/configs/animation'

const slidesStore = useSlidesStore()
const mainStore = useMainStore()

const { currentSlide } = storeToRefs(slidesStore)
// const { currentSlideAnimations } = storeToRefs(slidesStore) // Unused for now
// const { elements: currentSlideElements } = storeToRefs(mainStore) // Unused for now

const scale = ref(50) // pixels per second
const timelineGridRef = ref<HTMLDivElement | null>(null)

// Flatten all known animation effects for easy lookup (currently unused, but might be useful later)
// const allAnimationEffects = computed(() => {
//   const effects: Record<string, string> = {};
//   [...ENTER_ANIMATIONS, ...EXIT_ANIMATIONS, ...ATTENTION_ANIMATIONS].forEach(group => {
//     group.children.forEach(anim => {
//       effects[anim.value] = anim.name
//     })
//   })
//   return effects
// })

const currentAnimations = computed(() => {
  return currentSlide.value?.animations || []
})

const getElementShortName = (elId: string) => {
  const element = currentSlide.value?.elements.find(el => el.id === elId)
  if (!element) return 'Unknown'
  return `${element.type.substring(0, 4)}...${elId.substring(0, 3)}`
}

const getAnimationStyle = (animation: PPTAnimation) => {
  const startTimeMs = animation.startTime || 0
  const durationMs = animation.duration
  return {
    left: `${(startTimeMs / 1000) * scale.value}px`,
    width: `${(durationMs / 1000) * scale.value}px`,
    backgroundColor: getAnimationColor(animation.type),
  }
}

const getAnimationColor = (type: 'in' | 'out' | 'attention') => {
  if (type === 'in') return '#68a490' // Greenish
  if (type === 'out') return '#d86344' // Reddish
  if (type === 'attention') return '#e8b76a' // Yellowish
  return '#ccc'
}

const zoomIn = () => {
  scale.value = Math.min(500, scale.value + 20)
}

const zoomOut = () => {
  scale.value = Math.max(10, scale.value - 20)
}

// Placeholder for drag functionality
const onDragStart = (animation: PPTAnimation, event: MouseEvent) => {
  // console.log('Attempting to drag:', animation.id, event.clientX)
  // Drag logic will be more complex, involving tracking mouse movement,
  // calculating new startTime, and dispatching store actions.
  // This will be implemented in a subsequent subtask.
}

// TODO: Implement timeline axis rendering
// TODO: Implement drag-and-drop to change startTime
// TODO: Implement resizing to change duration
// TODO: Implement action call for duration change

</script>

<style scoped>
.timeline-editor-panel {
  padding: 10px;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  height: 300px; /* Example height */
  overflow-x: auto;
}
.timeline-controls {
  margin-bottom: 10px;
}
.timeline-grid {
  position: relative;
  height: 200px; /* Example height */
  background-image: linear-gradient(to right, #e0e0e0 1px, transparent 1px);
  background-size: calc(1s * v-bind(scale + 'px')) 100%; /* Dynamic grid lines */
  border: 1px solid #ccc;
}
.timeline-animation-item {
  position: absolute;
  height: 30px;
  line-height: 30px;
  color: white;
  padding: 0 5px;
  border-radius: 3px;
  cursor: grab;
  font-size: 12px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  border: 1px solid #333;
}
.timeline-axis {
  height: 30px;
  background-color: #ddd;
  /* Needs markers for time */
}
</style>
