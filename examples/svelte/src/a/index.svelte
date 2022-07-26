<script>
  import HelloWorld from './HelloWorld.svelte';
</script>

<div class="container">
  <div>title</div>
  <HelloWorld />
</div>

<style module lang="less">
  .container {
    color: #888;

    > div {
      border: 1px solid red;
    }
  }
</style>
