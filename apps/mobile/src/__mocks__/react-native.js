const React = require('react');

const View = ({ children, testID, onTouchEnd }) => React.createElement('div', { 'data-testid': testID, onMouseUp: onTouchEnd }, children);
const Text = ({ children, testID }) => React.createElement('span', { 'data-testid': testID }, children);
const Pressable = ({ children, onPress, disabled, testID }) => 
  React.createElement('button', { onClick: onPress, disabled, 'data-testid': testID }, children);
const Alert = { alert: jest.fn() };
const StyleSheet = { create: (obj) => obj };
const ActivityIndicator = () => React.createElement('div', { 'data-testid': 'activity-indicator' });

module.exports = {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
};
