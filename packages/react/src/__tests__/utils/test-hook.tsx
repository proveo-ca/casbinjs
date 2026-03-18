import React, { useEffect, type ComponentType, type ReactNode } from "react";
import { render, type RenderResult } from "@testing-library/react";

interface TestHookProps<TProps, TResult> {
  hook: (props: TProps) => TResult;
  props: TProps;
  onResult?: (result: TResult) => void;
  wrapper?: ComponentType<{ children: ReactNode }>;
}

export const TestHook = <TProps, TResult>({
  hook,
  props,
  onResult,
}: Omit<TestHookProps<TProps, TResult>, "wrapper">) => {
  const result = hook(props);

  useEffect(() => {
    onResult?.(result);
  }, [result, onResult]);

  return null;
};

export const renderHookTest = <TProps, TResult>({
  hook,
  props,
  onResult,
  wrapper,
}: TestHookProps<TProps, TResult>): RenderResult =>
  render(<TestHook hook={hook} props={props} onResult={onResult} />, {
    wrapper,
  });
