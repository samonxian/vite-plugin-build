<script context="module" lang="ts">
  export interface Options {
    title: string;
  }
</script>

<script lang="ts">
  import HelloWorld from './HelloWorld.svelte';
</script>

<div class="container">
  <div>title</div>
  <HelloWorld title="title" />
</div>

<style module lang="less">
  .container {
    color: #888;

    > div {
      border: 1px solid red;
    }
  }
</style>
