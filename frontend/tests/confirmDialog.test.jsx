import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../src/components/ui/ConfirmDialog';

const setup = (props = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  render(
    <ConfirmDialog
      open
      title="Eliminar el logro"
      description="No se puede deshacer."
      confirmText="Eliminar"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />
  );

  return { onConfirm, onCancel };
};

describe('ConfirmDialog', () => {
  it('no renderiza nada mientras está cerrado', () => {
    render(<ConfirmDialog open={false} title="Nada" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('confirma con el botón de acción', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = setup();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancela con Escape', async () => {
    const user = userEvent.setup();
    const { onCancel, onConfirm } = setup();

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('expone el diálogo a lectores de pantalla', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Eliminar el logro');
  });
});
