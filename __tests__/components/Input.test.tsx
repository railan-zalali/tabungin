import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../../src/components/common/Input';

describe('Input', () => {
    it('renders the label', () => {
        const { getByText } = render(<Input label="Nama" onChangeText={() => {}} />);
        expect(getByText('Nama')).toBeTruthy();
    });

    it('marks required fields with asterisk', () => {
        const { getByText } = render(<Input label="Email" required onChangeText={() => {}} />);
        expect(getByText('*')).toBeTruthy();
    });

    it('shows error message when provided', () => {
        const { getByText } = render(
            <Input label="Email" error="Email tidak valid" onChangeText={() => {}} />,
        );
        expect(getByText('Email tidak valid')).toBeTruthy();
    });

    it('shows hint when provided', () => {
        const { getByText } = render(
            <Input label="Sandi" hint="Minimal 8 karakter" onChangeText={() => {}} />,
        );
        expect(getByText('Minimal 8 karakter')).toBeTruthy();
    });

    it('calls onChangeText with typed value', () => {
        const onChangeText = jest.fn();
        const { getByLabelText } = render(
            <Input label="Nominal" onChangeText={onChangeText} />,
        );
        fireEvent.changeText(getByLabelText('Nominal'), '150000');
        expect(onChangeText).toHaveBeenCalledWith('150000');
    });

    it('forwards testID to the underlying TextInput', () => {
        const { getByTestId } = render(
            <Input label="Sandi" secureTextEntry onChangeText={() => {}} testID="pwd" />,
        );
        expect(getByTestId('pwd').props.secureTextEntry).toBe(true);
    });

    it('keeps label accessible for assistive tech', () => {
        const { getByLabelText } = render(<Input label="Email" onChangeText={() => {}} />);
        expect(getByLabelText('Email')).toBeTruthy();
    });
});
