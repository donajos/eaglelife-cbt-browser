param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('hide', 'restore')]
    [string]$Action,

    [int]$State
)

$ErrorActionPreference = 'Stop'

$source = @'
using System;
using System.Runtime.InteropServices;

public static class TaskbarControl
{
    private const uint ABM_GETSTATE = 0x00000004;
    private const uint ABM_SETSTATE = 0x0000000A;
    private const uint ABS_AUTOHIDE = 0x00000001;

    [StructLayout(LayoutKind.Sequential)]
    private struct AppBarData
    {
        public uint Size;
        public IntPtr Window;
        public uint CallbackMessage;
        public uint Edge;
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
        public IntPtr Parameter;
    }

    [DllImport("shell32.dll")]
    private static extern IntPtr SHAppBarMessage(uint message, ref AppBarData data);

    public static uint GetState()
    {
        var data = new AppBarData { Size = (uint)Marshal.SizeOf(typeof(AppBarData)) };
        return unchecked((uint)SHAppBarMessage(ABM_GETSTATE, ref data).ToInt64());
    }

    public static void SetState(uint state)
    {
        var data = new AppBarData
        {
            Size = (uint)Marshal.SizeOf(typeof(AppBarData)),
            Parameter = new IntPtr(state)
        };

        SHAppBarMessage(ABM_SETSTATE, ref data);
        var actualState = GetState();
        if (actualState != state)
        {
            throw new InvalidOperationException(
                "The taskbar state did not match the requested state.");
        }
    }

    public static uint AutoHideFlag
    {
        get { return ABS_AUTOHIDE; }
    }
}
'@

try {
    Add-Type -TypeDefinition $source -Language CSharp -ErrorAction Stop
    if ($Action -eq 'hide') {
        $currentState = [TaskbarControl]::GetState()
        [TaskbarControl]::SetState($currentState -bor [TaskbarControl]::AutoHideFlag)
        [Console]::Out.WriteLine($currentState)
    } else {
        [TaskbarControl]::SetState([uint32]$State)
    }
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
