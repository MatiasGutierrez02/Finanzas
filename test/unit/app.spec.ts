import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import App from '@/App.vue';

describe('App', () => {
  it('renders the current route outlet', () => {
    const wrapper = mount(App);

    expect(wrapper.findComponent({ name: 'router-view' }).exists()).toBe(true);
  });
});
