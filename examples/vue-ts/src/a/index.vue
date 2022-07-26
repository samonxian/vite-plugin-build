<script setup lang="ts">
import HelloWorld from './HelloWorld.vue'
</script>

<template>
  <div :class="$style.container">
    <HelloWorld />
  </div>
</template>

<style module lang="less">
.container {
  color: #888;
}
</style>

