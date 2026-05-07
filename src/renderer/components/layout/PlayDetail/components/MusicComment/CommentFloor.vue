<template lang="pug">
div(:class="$style.container")
  ul
    li(v-for="item in comments" :key="item.id" :class="$style.listItem")
      div(:class="$style.content")
        div(:class="$style.left")
          img( :class="$style.avatar" :src="item.avatar || commentDefImg" @error="handleUserImg")
        div(:class="$style.right")
          div(:class="$style.info")
            div(:class="$style.baseInfo")
              div.select(:class="$style.name") {{ item.userName }}
              div(:class="$style.metaInfo")
                time(v-if="item.timeStr" :class="$style.label") {{ timeFormat(item.timeStr) }}
                div(v-if="item.location" :class="$style.label") {{ $t('comment__location', { location: item.location }) }}
            div(v-if="item.likedCount != null" :class="$style.likes")
              line-icon(:icon="ThumbsUp" :size="18" :stroke-width="2.35" :class="$style.likesIcon")
              span {{ item.likedCount }}
          p.select(:class="$style.comment_text") {{ item.text }}
          div(v-if="item.images?.length" :class="$style.comment_images")
            img(v-for="(url, index) in item.images" :key="index" :src="url" loading="lazy" decoding="async")
      comment-floor(v-if="item.reply && item.reply.length" :class="$style.reply_floor" :comments="item.reply")
</template>

<script>
import commentDefImg from '@renderer/assets/images/defaultUser.jpg'
import { ThumbsUp } from 'lucide-vue-next'
import LineIcon from '@renderer/components/common/LineIcon.vue'

export default {
  name: 'CommentFloor',
  components: {
    LineIcon,
  },
  props: {
    comments: {
      type: Array,
      default() {
        return []
      },
    },
  },
  data() {
    return {
      commentDefImg,
      ThumbsUp,
    }
  },
  methods: {
    timeFormat(time) {
      return time
      // return formatTime(new Date(time), true)
    },
    handleUserImg(event) {
      event.target.src = this.commentDefImg
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@padding: 15px;

// .container {

// }

.listItem {
  border-bottom: 1px dashed var(--color-primary-alpha-800);
}

.content {
  padding: 14px 0;
  font-size: 13px;
  color: var(--color-font);
  display: flex;
}
.left {
  flex: none;
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: 0 4px 10px rgba(15, 23, 42, .08);
}
.right {
  flex: auto;
  min-width: 0;
  margin-left: 12px;
}

.info {
  display: flex;
  flex-flow: row nowrap;
  gap: 14px;
  width: 100%;
  min-height: 44px;
  line-height: 1.3;
  color: var(--color-450);
}
.baseInfo {
  height: 100%;
  flex: auto;
  display: flex;
  min-width: 0;
  flex-flow: column nowrap;
  justify-content: space-evenly;
}
.metaInfo {
  display: flex;
  flex-flow: row nowrap;
  min-width: 0;
  gap: 10px;
  overflow: hidden;
}
.name {
  flex: 0 1 auto;
  min-width: 0;
  .mixin-ellipsis-1();
  color: var(--color-650);
}
.label {
  flex: none;
  font-size: 12px;
  // margin-left: 5px;
}
.likes {
  flex: none;
  min-width: 64px;
  font-size: 12px;
  display: inline-flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 4px;
  text-align: right;
  padding-top: 2px;
  align-self: flex-start;
  color: var(--color-primary);
  opacity: .72;

  span {
    line-height: 18px;
  }
}
.likesIcon {
  flex: none;
  width: 18px;
  height: 18px;
  color: var(--color-primary);
}
.comment_text {
  text-align: justify;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-all;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}
.comment_images {
  display: flex;
  flex-flow: row wrap;
  gap: 5px;
  margin-top: 5px;

  img {
    max-width: 240px;
  }
}

.reply_floor {
  padding: 0 0 0 @padding;
  margin-left: @padding * 2;
  border-radius: .5rem;
  &:last-child {
    margin-bottom: 12px;
  }
  .listItem:last-child {
    border-bottom: none;
  }
  .right {
    margin-right: 10px;
  }

  background-color: var(--color-primary-light-500-alpha-700);
}


</style>
