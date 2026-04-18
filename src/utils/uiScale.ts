import { Dimensions } from 'react-native';

/**
 * UI scaling helpers based on design draft size.
 * Design baseline: 402 x 874 (px)
 */
const DESIGN_WIDTH = 402;
const DESIGN_HEIGHT = 874;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const scale = (size: number) => (SCREEN_WIDTH / DESIGN_WIDTH) * size;
export const verticalScale = (size: number) => (SCREEN_HEIGHT / DESIGN_HEIGHT) * size;

/**
 * A gentler scale that avoids over-scaling on very large screens.
 * factor: 0..1
 */
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

