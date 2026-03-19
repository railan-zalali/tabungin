import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';

export function AuthCallbackScreen() {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.text}>Menyelesaikan login Google...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        gap: 16,
        padding: 24,
    },
    text: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: Colors.textSecondary,
    },
});
