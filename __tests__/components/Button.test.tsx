import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../../src/components/common/Button';

describe('Button', () => {
    it('renders the label', () => {
        const { getByText } = render(<Button label="Simpan" onPress={() => {}} />);
        expect(getByText('Simpan')).toBeTruthy();
    });

    it('calls onPress when pressed', () => {
        const onPress = jest.fn();
        const { getByText } = render(<Button label="Simpan" onPress={onPress} />);
        fireEvent.press(getByText('Simpan'));
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
        const onPress = jest.fn();
        const { getByText } = render(<Button label="Simpan" onPress={onPress} disabled />);
        fireEvent.press(getByText('Simpan'));
        expect(onPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
        const onPress = jest.fn();
        // Saat loading, label tidak dirender (ganti ActivityIndicator) -> pakai label aksesibilitas
        const { getByLabelText } = render(<Button label="Simpan" onPress={onPress} loading />);
        fireEvent.press(getByLabelText('Simpan'));
        expect(onPress).not.toHaveBeenCalled();
    });

    it('passes accessibility hint through to the touchable', () => {
        const { getByLabelText } = render(
            <Button
                label="Simpan"
                onPress={() => {}}
                accessibilityHint="Menyimpan data transaksi"
            />,
        );
        expect(getByLabelText('Simpan').props.accessibilityHint).toBe('Menyimpan data transaksi');
    });

    it('exposes busy/disabled accessibility state when loading', () => {
        const { getByLabelText } = render(<Button label="Simpan" onPress={() => {}} loading />);
        expect(getByLabelText('Simpan').props.accessibilityState).toEqual({
            disabled: true,
            busy: true,
        });
    });

    it('matches snapshot for primary variant', () => {
        const tree = render(<Button label="Lanjut" onPress={() => {}} />).toJSON();
        expect(tree).toMatchSnapshot();
    });
});
