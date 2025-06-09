import { defineStore } from 'pinia'
import tinycolor from 'tinycolor2'
import { omit } from 'lodash'
import { Slide, SlideTheme, PPTElement, PPTAnimation } from '@/types/slides'
import { slides } from '@/mocks/slides'
import { theme } from '@/mocks/theme'
import { layouts } from '@/mocks/layout'

interface RemoveElementPropData {
  id: string;
  propName: string | string[];
}

interface UpdateElementData {
  id: string | string[];
  props: Partial<PPTElement>;
}

interface FormatedAnimation {
  animations: PPTAnimation[];
  autoNext: boolean;
}

export interface SlidesState {
  theme: SlideTheme;
  slides: Slide[];
  slideIndex: number;
  viewportRatio: number;
}

export const useSlidesStore = defineStore('slides', {
  state: (): SlidesState => ({
    theme: theme, // 主题样式
    slides: slides, // 幻灯片页面数据
    slideIndex: 0, // 当前页面索引
    viewportRatio: 0.5625, // 可是区域比例，默认16:9
  }),

  getters: {
    currentSlide(state) {
      return state.slides[state.slideIndex]
    },
  
    currentSlideAnimations(state) {
      const currentSlide = state.slides[state.slideIndex]
      if (!currentSlide?.animations) return []

      const els = currentSlide.elements
      const elIds = els.map(el => el.id)
      return currentSlide.animations.filter(animation => elIds.includes(animation.elId))
    },

    // 格式化的当前页动画
    // 优先处理带有 startTime 的动画，按时间排序并分组
    // 然后处理没有 startTime 的动画，沿用旧的 click, meantime, auto 逻辑
    formatedAnimations(state) {
      const currentSlide = state.slides[state.slideIndex]
      if (!currentSlide?.animations) return []

      const els = currentSlide.elements
      const elIds = els.map(el => el.id)
      const allAnimations = currentSlide.animations.filter(animation => elIds.includes(animation.elId))

      const timedAnimations: PPTAnimation[] = []
      const untimedAnimations: PPTAnimation[] = []

      for (const anim of allAnimations) {
        if (typeof anim.startTime === 'number') {
          timedAnimations.push(anim)
        }
        else {
          untimedAnimations.push(anim)
        }
      }

      // Sort timed animations by startTime
      timedAnimations.sort((a, b) => (a.startTime || 0) - (b.startTime || 0))

      const formatedTimedAnimations: FormatedAnimation[] = []
      if (timedAnimations.length > 0) {
        let currentGroup: PPTAnimation[] = [timedAnimations[0]]
        for (let i = 1; i < timedAnimations.length; i++) {
          if (timedAnimations[i].startTime === currentGroup[0].startTime) {
            currentGroup.push(timedAnimations[i])
          }
          else {
            formatedTimedAnimations.push({ animations: currentGroup, autoNext: false })
            currentGroup = [timedAnimations[i]]
          }
        }
        formatedTimedAnimations.push({ animations: currentGroup, autoNext: false })
      }

      const formatedUntimedAnimations: FormatedAnimation[] = []
      for (const animation of untimedAnimations) {
        if (animation.trigger === 'click' || !formatedUntimedAnimations.length) {
          formatedUntimedAnimations.push({ animations: [animation], autoNext: false })
        }
        else if (animation.trigger === 'meantime') {
          const last = formatedUntimedAnimations[formatedUntimedAnimations.length - 1]
          last.animations = last.animations.filter(item => item.elId !== animation.elId)
          last.animations.push(animation)
          formatedUntimedAnimations[formatedUntimedAnimations.length - 1] = last
        }
        else if (animation.trigger === 'auto') {
          const last = formatedUntimedAnimations[formatedUntimedAnimations.length - 1]
          last.autoNext = true
          formatedUntimedAnimations[formatedUntimedAnimations.length - 1] = last
          formatedUntimedAnimations.push({ animations: [animation], autoNext: false })
        }
      }
      return [...formatedTimedAnimations, ...formatedUntimedAnimations]
    },
  
    layouts(state) {
      const {
        themeColor,
        fontColor,
        fontName,
        backgroundColor,
      } = state.theme
  
      const subColor = tinycolor(fontColor).isDark() ? 'rgba(230, 230, 230, 0.5)' : 'rgba(180, 180, 180, 0.5)'
  
      const layoutsString = JSON.stringify(layouts)
        .replaceAll('{{themeColor}}', themeColor)
        .replaceAll('{{fontColor}}', fontColor)
        .replaceAll('{{fontName}}', fontName)
        .replaceAll('{{backgroundColor}}', backgroundColor)
        .replaceAll('{{subColor}}', subColor)
      
      return JSON.parse(layoutsString)
    },
  },

  actions: {
    setTheme(themeProps: Partial<SlideTheme>) {
      this.theme = { ...this.theme, ...themeProps }
    },
  
    setViewportRatio(viewportRatio: number) {
      this.viewportRatio = viewportRatio
    },
  
    setSlides(slides: Slide[]) {
      this.slides = slides
    },
  
    addSlide(slide: Slide | Slide[]) {
      const slides = Array.isArray(slide) ? slide : [slide]
      const addIndex = this.slideIndex + 1
      this.slides.splice(addIndex, 0, ...slides)
      this.slideIndex = addIndex
    },
  
    updateSlide(props: Partial<Slide>) {
      const slideIndex = this.slideIndex
      this.slides[slideIndex] = { ...this.slides[slideIndex], ...props }
    },
  
    deleteSlide(slideId: string | string[]) {
      const slidesId = Array.isArray(slideId) ? slideId : [slideId]
  
      const deleteSlidesIndex = []
      for (let i = 0; i < slidesId.length; i++) {
        const index = this.slides.findIndex(item => item.id === slidesId[i])
        deleteSlidesIndex.push(index)
      }
      let newIndex = Math.min(...deleteSlidesIndex)
  
      const maxIndex = this.slides.length - slidesId.length - 1
      if (newIndex > maxIndex) newIndex = maxIndex
  
      this.slideIndex = newIndex
      this.slides = this.slides.filter(item => !slidesId.includes(item.id))
    },
  
    updateSlideIndex(index: number) {
      this.slideIndex = index
    },
  
    addElement(element: PPTElement | PPTElement[]) {
      const elements = Array.isArray(element) ? element : [element]
      const currentSlideEls = this.slides[this.slideIndex].elements
      const newEls = [...currentSlideEls, ...elements]
      this.slides[this.slideIndex].elements = newEls
    },

    deleteElement(elementId: string | string[]) {
      const elementIdList = Array.isArray(elementId) ? elementId : [elementId]
      const currentSlideEls = this.slides[this.slideIndex].elements
      const newEls = currentSlideEls.filter(item => !elementIdList.includes(item.id))
      this.slides[this.slideIndex].elements = newEls
    },
  
    updateElement(data: UpdateElementData) {
      const { id, props } = data
      const elIdList = typeof id === 'string' ? [id] : id
  
      const slideIndex = this.slideIndex
      const slide = this.slides[slideIndex]
      const elements = slide.elements.map(el => {
        return elIdList.includes(el.id) ? { ...el, ...props } : el
      })
      this.slides[slideIndex].elements = (elements as PPTElement[])
    },
  
    removeElementProps(data: RemoveElementPropData) {
      const { id, propName } = data
      const propsNames = typeof propName === 'string' ? [propName] : propName
  
      const slideIndex = this.slideIndex
      const slide = this.slides[slideIndex]
      const elements = slide.elements.map(el => {
        return el.id === id ? omit(el, propsNames) : el
      })
      this.slides[slideIndex].elements = (elements as PPTElement[])
    },

    updateAnimationStartTime(data: { animationId: string, startTime: number }) {
      const { animationId, startTime } = data
      const slideIndex = this.slideIndex
      const animations = this.slides[slideIndex].animations
      if (!animations) return

      const animationIndex = animations.findIndex(anim => anim.id === animationId)
      if (animationIndex > -1) {
        animations[animationIndex].startTime = startTime
        // Optionally, trigger could be changed here, e.g.:
        // animations[animationIndex].trigger = 'timed';
        this.slides[slideIndex].animations = [...animations]
        // Consider adding history snapshot here if undo/redo is implemented
      }
    },

    updateAnimationDuration(data: { animationId: string, duration: number }) {
      const { animationId, duration } = data
      const slideIndex = this.slideIndex
      const slide = this.slides[slideIndex]
      if (!slide.animations) return

      const animationIndex = slide.animations.findIndex(anim => anim.id === animationId)
      if (animationIndex > -1) {
        slide.animations[animationIndex].duration = duration
        // Make sure reactivity is triggered if just updating a property in an array item
        this.slides[slideIndex].animations = [...slide.animations]
      }
      // Consider adding history snapshot here if needed
    },
  },
})